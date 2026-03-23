// ============================================================
// GET/POST /api/liquidaciones — CRUD liquidaciones
// Rama B — HU-22 (HU-210)
// ============================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calcularLiquidacion, INDICADORES_MARZO_2026 } from '@/lib/calculos/liquidacion'
import type { ApiResponse } from '@/lib/types/common'
import type {
  InputLiquidacion,
  Liquidacion,
  IndicadoresPrevisionales,
} from '@/lib/types/liquidacion'

// ============================================================
// GET /api/liquidaciones?contrato_id=UUID
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTENTICADO', message: 'Debe estar autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const contratoId = request.nextUrl.searchParams.get('contrato_id')

    let query = supabase
      .from('liquidaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('periodo', { ascending: false })

    if (contratoId) {
      query = query.eq('contrato_id', contratoId)
    }

    const { data, error } = await query

    if (error) {
      return Response.json({
        success: false,
        error: { code: 'ERROR_DB', message: error.message },
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

// ============================================================
// POST /api/liquidaciones — Crear liquidación
//
// Body: { contrato_id, periodo, dias_licencia_medica?, horas_extra?,
//         anticipo?, otros_bonos?, apv_monto?, apv_regimen? }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTENTICADO', message: 'Debe estar autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    const body = await request.json()

    // ── Validar campos requeridos ──
    if (!body.contrato_id) {
      return Response.json({
        success: false,
        error: { code: 'CAMPO_REQUERIDO', message: 'contrato_id es requerido' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    if (!body.periodo || !/^\d{4}-\d{2}$/.test(body.periodo)) {
      return Response.json({
        success: false,
        error: { code: 'PERIODO_INVALIDO', message: 'periodo requerido en formato YYYY-MM' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    // ── Validar contrato pertenece al usuario ──
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', body.contrato_id)
      .eq('user_id', user.id)
      .single()

    if (contratoError || !contrato) {
      return Response.json({
        success: false,
        error: { code: 'CONTRATO_NO_ENCONTRADO', message: 'Contrato no encontrado o no pertenece al usuario' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    // ── Verificar duplicado (contrato_id + periodo) ──
    const { data: existente } = await supabase
      .from('liquidaciones')
      .select('id')
      .eq('contrato_id', body.contrato_id)
      .eq('periodo', body.periodo)
      .single()

    if (existente) {
      return Response.json({
        success: false,
        error: { code: 'PERIODO_DUPLICADO', message: `Ya existe una liquidación para ${body.periodo} en este contrato` },
      } satisfies ApiResponse<never>, { status: 409 })
    }

    // ── Obtener indicadores del mes ──
    let indicadores: IndicadoresPrevisionales

    const { data: indData } = await supabase
      .from('indicadores_previsionales')
      .select('*')
      .eq('mes', body.periodo)
      .single()

    if (indData) {
      indicadores = indData as IndicadoresPrevisionales
    } else if (body.periodo === '2026-03') {
      indicadores = INDICADORES_MARZO_2026
    } else {
      // Use latest available or default
      indicadores = { ...INDICADORES_MARZO_2026, mes: body.periodo }
    }

    // ── Auto-rellenar RIMA desde liquidación anterior ──
    let rima = body.rima
    const diasLicencia = body.dias_licencia_medica ?? 0

    if (diasLicencia > 0 && diasLicencia < 30 && !rima) {
      const { data: anterior } = await supabase
        .from('liquidaciones')
        .select('resultado')
        .eq('contrato_id', body.contrato_id)
        .lt('periodo', body.periodo)
        .order('periodo', { ascending: false })
        .limit(1)
        .single()

      if (anterior?.resultado) {
        const resultadoAnterior = anterior.resultado as unknown as { totales?: { bruto?: number } }
        rima = resultadoAnterior.totales?.bruto
      }
    }

    // ── Construir input del motor ──
    const diasTrabajados = body.dias_trabajados ?? (30 - diasLicencia)

    const input: InputLiquidacion = {
      sueldo_base: contrato.sueldo_base,
      tipo_sueldo: contrato.tipo_sueldo ?? 'bruto',
      afp: contrato.afp,
      es_pensionado: body.es_pensionado ?? false,
      dias_trabajados: diasTrabajados,
      dias_licencia_medica: diasLicencia || undefined,
      rima: rima || undefined,
      horas_extra: body.horas_extra ?? undefined,
      anticipo: body.anticipo ?? undefined,
      otros_bonos: body.otros_bonos ?? undefined,
      apv_monto: body.apv_monto ?? undefined,
      apv_regimen: body.apv_regimen ?? undefined,
      cargas_familiares: body.cargas_familiares ?? contrato.cargas_familiares ?? undefined,
      colacion: contrato.colacion ?? undefined,
      movilizacion: contrato.movilizacion ?? undefined,
      gratificacion: contrato.gratificacion ? contrato.sueldo_base * 0.25 / 12 : undefined,
    }

    // ── Calcular motor v3.1 ──
    const resultado = calcularLiquidacion(input, indicadores)

    // Check for validation errors
    if (resultado.meta.errores && resultado.meta.errores.length > 0) {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDACION_MOTOR',
          message: resultado.meta.errores.join('; '),
        },
      } satisfies ApiResponse<never>, { status: 422 })
    }

    // ── Guardar en DB ──
    const { data: liquidacion, error: insertError } = await supabase
      .from('liquidaciones')
      .insert({
        contrato_id: body.contrato_id,
        user_id: user.id,
        periodo: body.periodo,
        input,
        resultado,
        estado: 'calculada',
        motor_version: 'v3.1',
        // Campos desnormalizados para consultas
        bruto: resultado.totales.bruto,
        liquido: resultado.totales.liquido,
        total_cotizaciones: resultado.cotizaciones_empleador.total_cotizaciones,
        costo_total: resultado.totales.costo_total,
      })
      .select()
      .single()

    if (insertError) {
      return Response.json({
        success: false,
        error: { code: 'ERROR_DB', message: insertError.message },
      } satisfies ApiResponse<never>, { status: 500 })
    }

    return Response.json({
      success: true,
      data: liquidacion as Liquidacion,
    } satisfies ApiResponse<Liquidacion>, { status: 201 })

  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({
        success: false,
        error: { code: 'JSON_INVALIDO', message: 'El body debe ser JSON válido' },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
