import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generarCartolaAnualPDF } from '@/lib/pdf/generar-liquidacion'
import type { Liquidacion } from '@/lib/types/liquidacion'
import type { Contrato } from '@/lib/types/contrato'

/**
 * POST /api/contratos/[id]/cartola-anual
 *
 * Genera un PDF con el resumen anual de todos los pagos de un contrato.
 * Query param: ?anio=2026 (default: año actual)
 *
 * Response: { pdf_url: string }
 */
export async function POST(
  req: NextRequest,
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

  const anio = req.nextUrl.searchParams.get('anio') || String(new Date().getFullYear())

  // Fetch contrato
  const { data: contrato, error: contratoError } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', id)
    .single()

  if (contratoError || !contrato) {
    return Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Contrato no encontrado' } },
      { status: 404 }
    )
  }

  const c = contrato as Contrato

  // Fetch all liquidaciones for this contrato in the given year
  const { data: liquidaciones, error: liqError } = await supabase
    .from('liquidaciones')
    .select('*')
    .eq('contrato_id', id)
    .gte('periodo', `${anio}-01`)
    .lte('periodo', `${anio}-12`)
    .order('periodo', { ascending: true })

  if (liqError) {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: liqError.message } },
      { status: 500 }
    )
  }

  if (!liquidaciones || liquidaciones.length === 0) {
    return Response.json(
      { success: false, error: { code: 'SIN_DATOS', message: `No hay liquidaciones para el año ${anio}` } },
      { status: 404 }
    )
  }

  const liqs = liquidaciones as Liquidacion[]

  try {
    const variables = buildCartolaVariables(liqs, c, anio)
    const pdfUrl = await generarCartolaAnualPDF(id, anio, variables)

    return Response.json({
      success: true,
      data: { pdf_url: pdfUrl },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generando cartola'
    return Response.json(
      { success: false, error: { code: 'PDF_ERROR', message } },
      { status: 500 }
    )
  }
}

function buildCartolaVariables(
  liqs: Liquidacion[],
  c: Contrato,
  anio: string
): Record<string, unknown> {
  const rows = liqs.map((liq) => {
    const r = liq.resultado
    const otrosDesc = r.descuentos_trabajador.anticipo + r.descuentos_trabajador.apv + r.descuentos_trabajador.cesantia
    return {
      periodo: liq.periodo,
      bruto: r.totales.bruto,
      afp: r.descuentos_trabajador.afp,
      salud: r.descuentos_trabajador.salud,
      iusc: r.descuentos_trabajador.iusc,
      otros_descuentos: otrosDesc,
      liquido: r.totales.liquido,
      costo_total: r.totales.costo_total,
    }
  })

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

  const totalBruto = sum(rows.map((r) => r.bruto))
  const totalAfp = sum(rows.map((r) => r.afp))
  const totalSalud = sum(rows.map((r) => r.salud))
  const totalIusc = sum(rows.map((r) => r.iusc))
  const totalOtros = sum(rows.map((r) => r.otros_descuentos))
  const totalLiquido = sum(rows.map((r) => r.liquido))
  const totalCosto = sum(rows.map((r) => r.costo_total))

  // Aggregate employer contributions
  const totalSis = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.sis))
  const totalAccidentes = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.accidentes))
  const totalIndemnizacion = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.indemnizacion))
  const totalCesantia = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.cesantia))
  const totalAfpEmp = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.afp_empleador))
  const totalExpVida = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.expectativa_vida))
  const totalRentProt = sum(liqs.map((l) => l.resultado.cotizaciones_empleador.rentabilidad_protegida))

  const cotizaciones_acumuladas = [
    { nombre: 'Seguro de Invalidez y Sobrevivencia (SIS)', total: totalSis },
    { nombre: 'Accidentes del Trabajo (ISL)', total: totalAccidentes },
    { nombre: 'Indemnización a Todo Evento', total: totalIndemnizacion },
    { nombre: 'Seguro de Cesantía', total: totalCesantia },
    { nombre: 'Capitalización Individual AFP (Reforma)', total: totalAfpEmp },
    { nombre: 'Expectativa de Vida (Reforma)', total: totalExpVida },
    { nombre: 'Rentabilidad Protegida (Reforma)', total: totalRentProt },
  ]

  const totalCotizacionesAnual = totalSis + totalAccidentes + totalIndemnizacion +
    totalCesantia + totalAfpEmp + totalExpVida + totalRentProt

  return {
    anio,
    razon_social: c.razon_social,
    trabajador_nombre: `${c.nombre_trabajador} ${c.apellidos_trabajador}`,
    numero_documento: c.numero_documento,
    liquidaciones: rows,
    total_bruto: totalBruto,
    total_afp: totalAfp,
    total_salud: totalSalud,
    total_iusc: totalIusc,
    total_otros: totalOtros,
    total_liquido: totalLiquido,
    total_costo: totalCosto,
    cotizaciones_acumuladas,
    total_cotizaciones_anual: totalCotizacionesAnual,
  }
}
