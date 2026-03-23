import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generarLiquidacionPDF, generarResumenPagosPDF } from '@/lib/pdf/generar-liquidacion'
import type { Liquidacion } from '@/lib/types/liquidacion'
import type { Contrato } from '@/lib/types/contrato'

/**
 * POST /api/liquidaciones/[id]/generar-pdf
 *
 * Genera el PDF de liquidación de sueldo + PDF resumen de pagos del empleador.
 * Sube ambos a Supabase Storage y actualiza la liquidación.
 *
 * Response: { pdf_liquidacion_url, pdf_resumen_pagos_url }
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

  const liq = liquidacion as Liquidacion

  // Fetch contrato for worker/employer info
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

  try {
    // Variables for liquidacion template
    const liqVariables = mapLiquidacionVariables(liq, c)

    // Variables for resumen pagos template
    const resumenVariables = mapResumenPagosVariables(liq, c)

    // Generate both PDFs in parallel
    const [pdfLiqUrl, pdfResumenUrl] = await Promise.all([
      generarLiquidacionPDF(liq.id, liqVariables),
      generarResumenPagosPDF(liq.id, resumenVariables),
    ])

    // Update liquidacion with PDF URLs and estado
    const { error: updateError } = await supabase
      .from('liquidaciones')
      .update({
        pdf_url: pdfLiqUrl,
        pdf_resumen_url: pdfResumenUrl,
        estado: 'emitida',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error actualizando liquidación:', updateError)
    }

    return Response.json({
      success: true,
      data: {
        pdf_liquidacion_url: pdfLiqUrl,
        pdf_resumen_pagos_url: pdfResumenUrl,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generando PDF'
    return Response.json(
      { success: false, error: { code: 'PDF_ERROR', message } },
      { status: 500 }
    )
  }
}

function mapLiquidacionVariables(liq: Liquidacion, c: Contrato): Record<string, unknown> {
  const r = liq.resultado
  return {
    periodo: liq.periodo,
    trabajador_nombre: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
    rut_trabajador: c.numero_documento,
    razon_social: c.razon_social,

    // Haberes
    sueldo_base: r.haberes.sueldo_base,
    gratificacion: r.haberes.gratificacion,
    colacion: r.haberes.colacion,
    movilizacion: r.haberes.movilizacion,
    horas_extra: r.haberes.horas_extra,
    asignacion_familiar: r.haberes.asignacion_familiar,
    otros_bonos: r.haberes.otros_bonos,
    total_haberes: r.haberes.total_haberes,

    // Descuentos
    afp: r.descuentos_trabajador.afp,
    salud: r.descuentos_trabajador.salud,
    cesantia: r.descuentos_trabajador.cesantia,
    iusc: r.descuentos_trabajador.iusc,
    anticipo: r.descuentos_trabajador.anticipo,
    apv: r.descuentos_trabajador.apv,
    total_descuentos: r.descuentos_trabajador.total_descuentos,

    // Cotizaciones empleador
    sis: r.cotizaciones_empleador.sis,
    accidentes: r.cotizaciones_empleador.accidentes,
    indemnizacion: r.cotizaciones_empleador.indemnizacion,
    cesantia_empleador: r.cotizaciones_empleador.cesantia,
    afp_empleador: r.cotizaciones_empleador.afp_empleador,
    expectativa_vida: r.cotizaciones_empleador.expectativa_vida,
    rentabilidad_protegida: r.cotizaciones_empleador.rentabilidad_protegida,
    ley_sanna: r.cotizaciones_empleador.ley_sanna || 0,
    total_cotizaciones: r.cotizaciones_empleador.total_cotizaciones,

    // Totales
    bruto: r.totales.bruto,
    total_imponible: r.totales.total_imponible,
    liquido: r.totales.liquido,
    total_empleador: r.totales.total_empleador,
    costo_total: r.totales.costo_total,
  }
}

function mapResumenPagosVariables(liq: Liquidacion, c: Contrato): Record<string, unknown> {
  const r = liq.resultado
  const emp = r.cotizaciones_empleador

  const cotizaciones_obligatorias = [
    { nombre: 'Seguro de Invalidez y Sobrevivencia (SIS)', tasa: '1,54', base: r.totales.total_imponible, monto: emp.sis },
    { nombre: 'Accidentes del Trabajo (ISL)', tasa: '0,93', base: r.totales.total_imponible, monto: emp.accidentes },
    { nombre: 'Indemnización a Todo Evento', tasa: '1,11', base: r.totales.total_imponible, monto: emp.indemnizacion },
    { nombre: 'Seguro de Cesantía', tasa: '3,00', base: r.totales.total_imponible, monto: emp.cesantia },
  ]

  const cotizaciones_reforma = [
    { nombre: 'Capitalización Individual AFP', tasa: '0,10', base: r.totales.total_imponible, monto: emp.afp_empleador },
    { nombre: 'Expectativa de Vida', tasa: '0,90', base: r.totales.total_imponible, monto: emp.expectativa_vida },
    { nombre: 'Rentabilidad Protegida', tasa: '0,00', base: r.totales.total_imponible, monto: emp.rentabilidad_protegida },
  ]

  const subtotalObligatorias = emp.sis + emp.accidentes + emp.indemnizacion + emp.cesantia
  const subtotalReforma = emp.afp_empleador + emp.expectativa_vida + emp.rentabilidad_protegida

  return {
    periodo: liq.periodo,
    razon_social: c.razon_social,
    trabajador_nombre: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
    bruto: r.totales.bruto,
    liquido: r.totales.liquido,
    total_cotizaciones: emp.total_cotizaciones,
    total_empleador: r.totales.costo_total,
    cotizaciones_obligatorias,
    cotizaciones_reforma,
    subtotal_obligatorias: subtotalObligatorias,
    subtotal_reforma: subtotalReforma,
  }
}
