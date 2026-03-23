// ============================================================
// POST /api/liquidaciones/[id]/enviar — Enviar liquidación por email
// Rama B — HU-212
// ============================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarEmailLiquidacion } from '@/lib/email/resend'
import type { ApiResponse } from '@/lib/types/common'
import type { ResultadoLiquidacion } from '@/lib/types/liquidacion'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({
        success: false,
        error: { code: 'NO_AUTENTICADO', message: 'Debe estar autenticado' },
      } satisfies ApiResponse<never>, { status: 401 })
    }

    // ── Leer liquidación ──
    const { data: liquidacion, error: liqError } = await supabase
      .from('liquidaciones')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (liqError || !liquidacion) {
      return Response.json({
        success: false,
        error: { code: 'NO_ENCONTRADA', message: 'Liquidación no encontrada' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    // ── Verificar que tiene PDFs generados ──
    if (!liquidacion.pdf_liquidacion_url || !liquidacion.pdf_resumen_url) {
      return Response.json({
        success: false,
        error: {
          code: 'SIN_PDFS',
          message: 'Debe generar los PDFs antes de enviar. Use POST /api/liquidaciones/[id]/generar-pdf',
        },
      } satisfies ApiResponse<never>, { status: 422 })
    }

    // ── Leer contrato ──
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('nombre_trabajador, apellidos_trabajador, email_trabajador, email_empleador')
      .eq('id', liquidacion.contrato_id)
      .single()

    if (contratoError || !contrato) {
      return Response.json({
        success: false,
        error: { code: 'CONTRATO_NO_ENCONTRADO', message: 'Contrato asociado no encontrado' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    const resultado = liquidacion.resultado as unknown as ResultadoLiquidacion

    // ── Enviar email ──
    await enviarEmailLiquidacion(
      {
        id,
        nombre_trabajador: `${contrato.nombre_trabajador} ${contrato.apellidos_trabajador}`,
        email_trabajador: contrato.email_trabajador,
        email_empleador: contrato.email_empleador,
        periodo: liquidacion.periodo,
        bruto: resultado.totales.bruto,
        descuentos: resultado.totales.total_descuentos,
        liquido: resultado.totales.liquido,
      },
      liquidacion.pdf_liquidacion_url,
      liquidacion.pdf_resumen_url,
    )

    // ── Actualizar estado ──
    await supabase
      .from('liquidaciones')
      .update({
        estado: 'enviada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return Response.json({
      success: true,
      data: { enviado: true },
    } satisfies ApiResponse<{ enviado: boolean }>)

  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error enviando email' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
