import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarRecordatorioMensual } from '@/lib/email/resend'

/**
 * POST /api/cron/recordatorio-mensual
 *
 * Cron job que se ejecuta el día 25 de cada mes.
 * Busca todos los usuarios con contratos activos y les envía
 * un recordatorio para generar las liquidaciones del mes.
 *
 * Autenticación: CRON_SECRET en header Authorization.
 * Se configura en Vercel Cron o servicio externo.
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

  const supabase = await createServerClient()

  try {
    // Fetch all active contracts grouped by user
    const { data: contratos, error: fetchError } = await supabase
      .from('contratos')
      .select('user_id, nombre_trabajador, apellidos_trabajador, razon_social')
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

    // Group contracts by user_id
    const userContratos = new Map<string, Array<{ nombre_trabajador: string }>>()
    for (const c of contratos) {
      const userId = c.user_id as string
      if (!userContratos.has(userId)) {
        userContratos.set(userId, [])
      }
      userContratos.get(userId)!.push({
        nombre_trabajador: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
      })
    }

    // Fetch user profiles for email and name
    const userIds = Array.from(userContratos.keys())
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, name')
      .in('id', userIds)

    if (profileError || !profiles) {
      return Response.json(
        { success: false, error: { code: 'DB_ERROR', message: profileError?.message || 'Error obteniendo perfiles' } },
        { status: 500 }
      )
    }

    let enviados = 0
    let errores = 0

    // Send reminders
    for (const profile of profiles) {
      const userContrats = userContratos.get(profile.id as string) || []
      try {
        await enviarRecordatorioMensual(
          profile.id as string,
          profile.email as string,
          (profile.name as string) || 'Usuario',
          userContrats
        )
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
