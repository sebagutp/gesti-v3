// ============================================================
// POST /api/calcular-liquidacion — API pública simulador
// Rama B — HU-112
// ============================================================

import { NextRequest } from 'next/server'
import { calcularLiquidacion } from '@/lib/calculos/liquidacion'
import type { InputLiquidacion } from '@/lib/types/liquidacion'
import type { ApiResponse, } from '@/lib/types/common'
import type { ResultadoLiquidacion } from '@/lib/types/liquidacion'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validación básica de campos requeridos
    const camposRequeridos: (keyof InputLiquidacion)[] = [
      'sueldo_base', 'tipo_sueldo', 'afp', 'es_pensionado', 'dias_trabajados',
    ]

    for (const campo of camposRequeridos) {
      if (body[campo] === undefined || body[campo] === null) {
        return Response.json({
          success: false,
          error: {
            code: 'CAMPO_REQUERIDO',
            message: `Campo requerido: ${campo}`,
          },
        } satisfies ApiResponse<never>, { status: 400 })
      }
    }

    // Validar tipo_sueldo
    if (!['liquido', 'imponible', 'bruto'].includes(body.tipo_sueldo)) {
      return Response.json({
        success: false,
        error: {
          code: 'TIPO_SUELDO_INVALIDO',
          message: 'tipo_sueldo debe ser "liquido", "imponible" o "bruto"',
        },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    // Validar sueldo_base numérico y positivo
    if (typeof body.sueldo_base !== 'number' || body.sueldo_base <= 0) {
      return Response.json({
        success: false,
        error: {
          code: 'SUELDO_INVALIDO',
          message: 'sueldo_base debe ser un número mayor a 0',
        },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    const input: InputLiquidacion = {
      sueldo_base: body.sueldo_base,
      tipo_sueldo: body.tipo_sueldo,
      afp: body.afp,
      es_pensionado: Boolean(body.es_pensionado),
      dias_trabajados: Number(body.dias_trabajados),
      dias_licencia_medica: body.dias_licencia_medica ?? undefined,
      rima: body.rima ?? undefined,
      horas_extra: body.horas_extra ?? undefined,
      anticipo: body.anticipo ?? undefined,
      otros_bonos: body.otros_bonos ?? undefined,
      apv_monto: body.apv_monto ?? undefined,
      apv_regimen: body.apv_regimen ?? undefined,
      cargas_familiares: body.cargas_familiares ?? undefined,
      colacion: body.colacion ?? undefined,
      movilizacion: body.movilizacion ?? undefined,
      gratificacion: body.gratificacion ?? undefined,
    }

    const resultado = calcularLiquidacion(input)

    // Si hay errores de validación del motor, retornar 422
    if (resultado.meta.errores && resultado.meta.errores.length > 0) {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDACION_MOTOR',
          message: resultado.meta.errores.join('; '),
        },
      } satisfies ApiResponse<never>, { status: 422 })
    }

    return Response.json({
      success: true,
      data: resultado,
    } satisfies ApiResponse<ResultadoLiquidacion>)

  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({
        success: false,
        error: {
          code: 'JSON_INVALIDO',
          message: 'El body debe ser JSON válido',
        },
      } satisfies ApiResponse<never>, { status: 400 })
    }

    return Response.json({
      success: false,
      error: {
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
      },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
