// ============================================================
// POST /api/liquidaciones/[id]/generar-pdf — Genera PDFs liquidación
// Rama B — HU-23 (HU-211)
//
// Genera 2 PDFs: liquidación de sueldo + resumen pagos empleador
// Sube a Storage, guarda URLs en BD
// ============================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generarLiquidacionPDF, generarResumenPagosPDF } from '@/lib/pdf/generar-liquidacion'
import type { ApiResponse } from '@/lib/types/common'
import type { ResultadoLiquidacion } from '@/lib/types/liquidacion'

interface RouteParams {
  params: Promise<{ id: string }>
}

function formatMoney(n: number): string {
  return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function formatPeriodo(periodo: string): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const [anio, mesStr] = periodo.split('-')
  const mesIdx = parseInt(mesStr, 10) - 1
  return `${meses[mesIdx]} ${anio}`
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

    // ── Leer contrato asociado ──
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', liquidacion.contrato_id)
      .single()

    if (contratoError || !contrato) {
      return Response.json({
        success: false,
        error: { code: 'CONTRATO_NO_ENCONTRADO', message: 'Contrato asociado no encontrado' },
      } satisfies ApiResponse<never>, { status: 404 })
    }

    const resultado = liquidacion.resultado as unknown as ResultadoLiquidacion
    const periodoFormateado = formatPeriodo(liquidacion.periodo)

    // ── Variables para template liquidación ──
    const varsLiquidacion = {
      // Datos contrato
      razon_social: contrato.razon_social,
      rut_empresa: contrato.rut_empresa,
      nombre_empleador: contrato.nombre_empleador,
      nombre_trabajador: `${contrato.nombre_trabajador} ${contrato.apellidos_trabajador}`,
      numero_documento: contrato.numero_documento,
      afp: contrato.afp,
      tipo_contrato: contrato.tipo_contrato === 'puertas_adentro' ? 'Puertas Adentro' : 'Puertas Afuera',

      // Periodo
      periodo: periodoFormateado,
      periodo_codigo: liquidacion.periodo,

      // Haberes
      sueldo_base: resultado.haberes.sueldo_base,
      gratificacion: resultado.haberes.gratificacion,
      colacion: resultado.haberes.colacion,
      movilizacion: resultado.haberes.movilizacion,
      horas_extra: resultado.haberes.horas_extra,
      asignacion_familiar: resultado.haberes.asignacion_familiar,
      otros_bonos: resultado.haberes.otros_bonos,
      total_haberes: resultado.haberes.total_haberes,

      // Descuentos
      afp_monto: resultado.descuentos_trabajador.afp,
      salud: resultado.descuentos_trabajador.salud,
      cesantia_trabajador: resultado.descuentos_trabajador.cesantia,
      iusc: resultado.descuentos_trabajador.iusc,
      anticipo: resultado.descuentos_trabajador.anticipo,
      apv: resultado.descuentos_trabajador.apv,
      total_descuentos: resultado.descuentos_trabajador.total_descuentos,

      // Totales
      bruto: resultado.totales.bruto,
      liquido: resultado.totales.liquido,
      liquido_formato: formatMoney(resultado.totales.liquido),

      // Flags para condicionales
      tiene_gratificacion: resultado.haberes.gratificacion > 0,
      tiene_colacion: resultado.haberes.colacion > 0,
      tiene_movilizacion: resultado.haberes.movilizacion > 0,
      tiene_horas_extra: resultado.haberes.horas_extra > 0,
      tiene_asignacion: resultado.haberes.asignacion_familiar > 0,
      tiene_otros_bonos: resultado.haberes.otros_bonos > 0,
      tiene_iusc: resultado.descuentos_trabajador.iusc > 0,
      tiene_anticipo: resultado.descuentos_trabajador.anticipo > 0,
      tiene_apv: resultado.descuentos_trabajador.apv > 0,

      // Meta
      motor_version: resultado.meta.motor_version,
      rli_calculado: resultado.meta.rli_calculado,
    }

    // ── Variables para template resumen pagos ──
    const varsResumen = {
      ...varsLiquidacion,

      // Cotizaciones empleador
      sis: resultado.cotizaciones_empleador.sis,
      accidentes: resultado.cotizaciones_empleador.accidentes,
      indemnizacion: resultado.cotizaciones_empleador.indemnizacion,
      cesantia_empleador: resultado.cotizaciones_empleador.cesantia,
      afp_empleador: resultado.cotizaciones_empleador.afp_empleador,
      expectativa_vida: resultado.cotizaciones_empleador.expectativa_vida,
      rentabilidad_protegida: resultado.cotizaciones_empleador.rentabilidad_protegida,
      total_cotizaciones: resultado.cotizaciones_empleador.total_cotizaciones,

      // Costos totales
      total_empleador: resultado.totales.total_empleador,
      costo_total: resultado.totales.costo_total,

      // Reforma flags
      tiene_afp_empleador: resultado.cotizaciones_empleador.afp_empleador > 0,
      tiene_expectativa_vida: resultado.cotizaciones_empleador.expectativa_vida > 0,
      tiene_rentabilidad: resultado.cotizaciones_empleador.rentabilidad_protegida > 0,
    }

    // ── Generar ambos PDFs ──
    const [pdfLiquidacionUrl, pdfResumenUrl] = await Promise.all([
      generarLiquidacionPDF(id, varsLiquidacion),
      generarResumenPagosPDF(id, varsResumen),
    ])

    // ── Actualizar URLs en BD ──
    await supabase
      .from('liquidaciones')
      .update({
        pdf_liquidacion_url: pdfLiquidacionUrl,
        pdf_resumen_url: pdfResumenUrl,
        estado: 'emitida',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    // ── Insertar notificación ──
    try {
      await supabase.from('notificaciones').insert({
        user_id: user.id,
        tipo: 'success',
        titulo: 'Liquidación generada',
        mensaje: `Liquidación de ${contrato.nombre_trabajador} ${contrato.apellidos_trabajador} — ${periodoFormateado} generada exitosamente.`,
        leida: false,
      })
    } catch {
      // non-blocking
    }

    return Response.json({
      success: true,
      data: {
        pdf_liquidacion_url: pdfLiquidacionUrl,
        pdf_resumen_url: pdfResumenUrl,
      },
    } satisfies ApiResponse<{ pdf_liquidacion_url: string; pdf_resumen_url: string }>)

  } catch {
    return Response.json({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Error generando PDFs' },
    } satisfies ApiResponse<never>, { status: 500 })
  }
}
