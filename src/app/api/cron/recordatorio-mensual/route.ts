import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarRecordatorioMensual } from '@/lib/email/resend'

/**
 * POST /api/cron/recordatorio-mensual
 *
 * Cron job que se ejecuta el día 25 y el último día de cada mes.
 * Busca empleadores con plan activo que tengan contratos activos
 * y no hayan generado la liquidación del mes actual, y les envía
 * un recordatorio por email + notificación en DB.
 *
 * Autenticación: CRON_SECRET en header Authorization.
 *
 * Response: { enviados: number, errores: number }
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      { success: false, error: { code: 'NO_AUTH', message: 'Cron secret inválido' } },
      { status: 401 }
    )
  }

  // Validate day: only run on day 25 or last day of month
  const now = new Date()
  const day = now.getDate()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const isDay25 = day === 25
  const isLastDay = day === lastDayOfMonth

  // Allow forced execution via query param (for testing)
  const forceRun = req.nextUrl.searchParams.get('force') === 'true'

  if (!isDay25 && !isLastDay && !forceRun) {
    return Response.json({
      success: true,
      data: { enviados: 0, errores: 0, message: 'No es día 25 ni último día del mes' },
    })
  }

  const supabase = await createServerClient()
  const periodoActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  try {
    // Fetch all active contracts
    const { data: contratos, error: fetchError } = await supabase
      .from('contratos')
      .select('id, user_id, nombre_trabajador, apellidos_trabajador, razon_social')
      .eq('vigente', true)
      .eq('estado', 'activo')

    if (fetchError) {
      return Response.json(
        { success: false, error: { code: 'DB_ERROR', message: fetchError.message } },
        { status: 500 }
      )
    }

    if (!contratos || contratos.length === 0) {
      return Response.json({
        success: true,
        data: { enviados: 0, errores: 0, message: 'No hay contratos activos' },
      })
    }

    // Fetch liquidaciones already generated this month
    const contratoIds = contratos.map((c) => c.id as string)
    const { data: liquidacionesExistentes } = await supabase
      .from('liquidaciones')
      .select('contrato_id')
      .eq('periodo', periodoActual)
      .in('contrato_id', contratoIds)

    const contratosConLiquidacion = new Set(
      (liquidacionesExistentes ?? []).map((l) => l.contrato_id as string)
    )

    // Filter: only contracts WITHOUT liquidación for current month
    const contratosPendientes = contratos.filter(
      (c) => !contratosConLiquidacion.has(c.id as string)
    )

    if (contratosPendientes.length === 0) {
      return Response.json({
        success: true,
        data: { enviados: 0, errores: 0, message: 'Todos los contratos tienen liquidación generada' },
      })
    }

    // Group pending contracts by user_id
    const userContratos = new Map<string, Array<{ nombre_trabajador: string }>>()
    for (const c of contratosPendientes) {
      const userId = c.user_id as string
      if (!userContratos.has(userId)) {
        userContratos.set(userId, [])
      }
      userContratos.get(userId)!.push({
        nombre_trabajador: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
      })
    }

    // Fetch user profiles + billing to check active plan
    const userIds = Array.from(userContratos.keys())
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, nombre')
      .in('id', userIds)

    if (profileError || !profiles) {
      return Response.json(
        { success: false, error: { code: 'DB_ERROR', message: profileError?.message || 'Error obteniendo perfiles' } },
        { status: 500 }
      )
    }

    const { data: billingRecords } = await supabase
      .from('user_billing')
      .select('user_id, plan_status')
      .in('user_id', userIds)
      .eq('plan_status', 'active')

    const usersWithActivePlan = new Set(
      (billingRecords ?? []).map((b) => b.user_id as string)
    )

    let enviados = 0
    let errores = 0

    for (const profile of profiles) {
      const userId = profile.id as string
      // Only send to users with active plan
      if (!usersWithActivePlan.has(userId)) continue

      const userContrats = userContratos.get(userId) || []
      try {
        await enviarRecordatorioMensual(
          userId,
          profile.email as string,
          (profile.nombre as string) || 'Usuario',
          userContrats
        )

        // Insert notification in DB
        await supabase.from('notificaciones').insert({
          user_id: userId,
          tipo: 'info',
          titulo: 'Recordatorio de liquidación',
          mensaje: `Tienes ${userContrats.length} contrato(s) sin liquidación generada para ${periodoActual}.`,
          leida: false,
        })

        enviados++
      } catch (error) {
        console.error(`Error enviando recordatorio a ${profile.email}:`, error)
        errores++
      }
    }

    return Response.json({
      success: true,
      data: { enviados, errores },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error en cron recordatorio'
    return Response.json(
      { success: false, error: { code: 'CRON_ERROR', message } },
      { status: 500 }
    )
  }
}
