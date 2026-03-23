import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarEmailLiquidacion } from '@/lib/email/resend'
import type { Liquidacion } from '@/lib/types/liquidacion'
import type { Contrato } from '@/lib/types/contrato'

/**
 * POST /api/liquidaciones/[id]/enviar
 *
 * Envía email con la liquidación de sueldo al trabajador y empleador.
 * Incluye PDFs adjuntos (liquidación detallada + resumen de pagos).
 * Actualiza estado de la liquidación a "enviada".
 *
 * Prerequisito: El PDF debe haber sido generado previamente (pdf_url debe existir).
 *
 * Response: { enviado: true }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json(
      { success: false, error: { code: 'NO_AUTH', message: 'No autenticado' } },
      { status: 401 }
    )
  }

  // Fetch liquidacion
  const { data: liquidacion, error: liqError } = await supabase
    .from('liquidaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (liqError || !liquidacion) {
    return Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Liquidación no encontrada' } },
      { status: 404 }
    )
  }

  const liq = liquidacion as Liquidacion & { pdf_resumen_url?: string }

  // Verify PDFs exist
  if (!liq.pdf_url) {
    return Response.json(
      { success: false, error: { code: 'PDF_NO_GENERADO', message: 'El PDF de la liquidación no ha sido generado. Usa /generar-pdf primero.' } },
      { status: 400 }
    )
  }

  // Fetch contrato for worker/employer contact info
  const { data: contrato, error: contratoError } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', liq.contrato_id)
    .single()

  if (contratoError || !contrato) {
    return Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Contrato asociado no encontrado' } },
      { status: 404 }
    )
  }

  const c = contrato as Contrato
  const r = liq.resultado

  try {
    await enviarEmailLiquidacion(
      {
        id: liq.id,
        nombre_trabajador: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
        email_trabajador: c.email_trabajador,
        email_empleador: c.email_empleador,
        periodo: liq.periodo,
        bruto: r.totales.bruto,
        descuentos: r.descuentos_trabajador.total_descuentos,
        liquido: r.totales.liquido,
      },
      liq.pdf_url,
      liq.pdf_resumen_url || liq.pdf_url
    )

    // Update estado to "enviada"
    const { error: updateError } = await supabase
      .from('liquidaciones')
      .update({
        estado: 'enviada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error actualizando estado liquidación:', updateError)
    }

    return Response.json({
      success: true,
      data: { enviado: true },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error enviando email'
    return Response.json(
      { success: false, error: { code: 'EMAIL_ERROR', message } },
      { status: 500 }
    )
  }
}
