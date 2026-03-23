import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calcularLiquidacion, INDICADORES_MARZO_2026 } from '@/lib/calculos/liquidacion'
import { validarInput } from '@/lib/calculos/validaciones'
import type { InputLiquidacion } from '@/lib/types/liquidacion'

/**
 * GET /api/liquidaciones?contrato_id=UUID — Lista liquidaciones de un contrato
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } }, { status: 401 })
  }

  const contratoId = req.nextUrl.searchParams.get('contrato_id')

  let query = supabase.from('liquidaciones').select('*').order('periodo', { ascending: false })

  if (contratoId) {
    query = query.eq('contrato_id', contratoId)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return Response.json({ success: true, data })
}

/**
 * POST /api/liquidaciones — Crea y calcula una nueva liquidación
 *
 * Request: { contrato_id, periodo, dias_licencia_medica?, horas_faltadas?, hh_extra?, anticipo?, otros_bonos? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ success: false, error: { code: 'JSON_INVALIDO', message: 'JSON inválido' } }, { status: 400 })
  }

  const contratoId = body.contrato_id as string
  const periodo = body.periodo as string

  if (!contratoId || !periodo) {
    return Response.json(
      { success: false, error: { code: 'CAMPO_REQUERIDO', message: 'contrato_id y periodo son requeridos' } },
      { status: 400 }
    )
  }

  // Fetch contrato to get salary info
  const { data: contrato, error: contratoError } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', contratoId)
    .single()

  if (contratoError || !contrato) {
    return Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Contrato no encontrado' } },
      { status: 404 }
    )
  }

  // Build InputLiquidacion from contrato + request body
  const input: InputLiquidacion = {
    sueldo_base: contrato.sueldo_base,
    tipo_sueldo: contrato.tipo_sueldo,
    afp: contrato.afp,
    es_pensionado: false,
    dias_trabajados: 30 - ((body.dias_licencia_medica as number) || 0),
    dias_licencia_medica: (body.dias_licencia_medica as number) || undefined,
    rima: (body.rima as number) || undefined,
    horas_extra: (body.hh_extra as number) || undefined,
    anticipo: (body.anticipo as number) || undefined,
    otros_bonos: (body.otros_bonos as number) || (contrato.otros_bonos as number) || undefined,
    colacion: contrato.colacion || undefined,
    movilizacion: contrato.movilizacion || undefined,
    gratificacion: contrato.gratificacion ? undefined : 0,
  }

  // Validate
  const erroresValidacion = validarInput(input, INDICADORES_MARZO_2026)
  if (erroresValidacion.length > 0) {
    return Response.json(
      { success: false, error: { code: 'VALIDACION_MOTOR', message: erroresValidacion.join('; ') } },
      { status: 422 }
    )
  }

  // Calculate (uses default indicators — INDICADORES_MARZO_2026)
  const resultado = calcularLiquidacion(input)

  // Save to database
  const { data: liquidacion, error: insertError } = await supabase
    .from('liquidaciones')
    .insert({
      contrato_id: contratoId,
      user_id: user.id,
      periodo,
      input,
      resultado,
      estado: 'borrador',
      motor_version: 'v3.1',
    })
    .select()
    .single()

  if (insertError) {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: insertError.message } },
      { status: 500 }
    )
  }

  return Response.json({ success: true, data: liquidacion }, { status: 201 })
}
