import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calcularLiquidacion } from '@/lib/calculos/liquidacion'
import type { ApiResponse } from '@/lib/types/common'
import type { InputLiquidacion, Liquidacion } from '@/lib/types/liquidacion'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTH', message: 'No autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const contratoId = searchParams.get('contrato_id')
    const periodo = searchParams.get('periodo')

    let query = supabase
      .from('liquidaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('periodo', { ascending: false })

    if (contratoId) {
      query = query.eq('contrato_id', contratoId)
    }
    if (periodo) {
      query = query.eq('periodo', periodo)
    }

    const { data, error } = await query

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data as Liquidacion[],
    } satisfies ApiResponse<Liquidacion[]>)
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTH', message: 'No autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const body = await request.json()
    const { contrato_id, periodo, input } = body as {
      contrato_id: string
      periodo: string
      input: InputLiquidacion
    }

    if (!contrato_id || !periodo || !input) {
      return Response.json({
        success: false,
        error: { code: 'CAMPOS_REQUERIDOS', message: 'contrato_id, periodo e input son requeridos' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    // Check contrato belongs to user
    const { data: contrato, error: contratoErr } = await supabase
      .from('contratos')
      .select('id')
      .eq('id', contrato_id)
      .eq('user_id', user.id)
      .single()

    if (contratoErr || !contrato) {
      return Response.json({
        success: false,
        error: { code: 'CONTRATO_NO_ENCONTRADO', message: 'Contrato no encontrado' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    // Check duplicate periodo
    const { data: existing } = await supabase
      .from('liquidaciones')
      .select('id')
      .eq('contrato_id', contrato_id)
      .eq('periodo', periodo)
      .single()

    if (existing) {
      return Response.json({
        success: false,
        error: {
          code: 'PERIODO_DUPLICADO',
          message: `Ya existe una liquidación para el período ${periodo}`,
        },
      } satisfies ApiResponse<never>, { status: 409 })
    }

    // Calculate
    const resultado = calcularLiquidacion(input)

    if (resultado.meta.errores && resultado.meta.errores.length > 0) {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDACION_MOTOR',
          message: resultado.meta.errores.join('; '),
        },
      } satisfies ApiResponse<never>, { status: 422 })
    }

    // Save
    const { data: liquidacion, error: insertErr } = await supabase
      .from('liquidaciones')
      .insert({
        contrato_id,
        user_id: user.id,
        periodo,
        input,
        resultado,
        estado: 'emitida',
        motor_version: 'v3.1',
      })
      .select()
      .single()

    if (insertErr) {
      return Response.json({
        success: false,
        error: { code: 'DB_ERROR', message: insertErr.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: liquidacion as Liquidacion,
    } satisfies ApiResponse<Liquidacion>, { status: 201 })
  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
