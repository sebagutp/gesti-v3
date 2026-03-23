// ============================================================
// Edge Function: update-indicadores
// HU-300 + HU-301 — Sprint 3, Rama A
//
// Scrape Previred + SII para obtener indicadores previsionales
// del mes actual. Validación de rangos, upsert en
// indicadores_previsionales, log en indicadores_actualizacion_log.
// Fallback: si falla scraping → copiar mes anterior → email admin.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Tipos ──
interface AfpTasa {
  tasa_obligatoria: number
  tasa_seguro: number
}

interface TramoIUSC {
  rli_hasta: number
  factor: number
  rebaja: number
}

interface IndicadoresScraped {
  mes: string
  uf: number
  utm: number
  sueldo_minimo_tcp: number
  afp_tasas: Record<string, AfpTasa>
  tramos_iusc: TramoIUSC[]
  tope_afp: number
  tope_cesantia: number
  tasa_sis: number
  tasa_isl: number
  tasa_indemnizacion: number
  rli_exento_hasta: number
  reforma: {
    cap_individual_afp: number
    expectativa_vida: number
    rentabilidad_protegida: number
    ley_sanna: number
  }
}

// ── Rangos de validación ──
const RANGOS = {
  uf: { min: 30000, max: 50000 },
  utm: { min: 50000, max: 100000 },
  sueldo_minimo_tcp: { min: 400000, max: 800000 },
  tasa_afp: { min: 0.08, max: 0.15 },
  tasa_sis: { min: 0.01, max: 0.03 },
  tasa_isl: { min: 0.005, max: 0.02 },
  tasa_indemnizacion: { min: 0.005, max: 0.02 },
}

// ── Helpers ──
function getMesActual(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getMesAnterior(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const date = new Date(y, m - 2, 1) // m-1 is current month (0-indexed), m-2 is previous
  const py = date.getFullYear()
  const pm = String(date.getMonth() + 1).padStart(2, '0')
  return `${py}-${pm}`
}

// ── Scraping Previred ──
async function scrapePrevired(mes: string): Promise<Partial<IndicadoresScraped>> {
  // Previred publica indicadores en su portal público
  // URL pattern: https://www.previred.com/indicadores-previsionales/
  const url = 'https://www.previred.com/indicadores-previsionales/'

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Gesti/3.1 IndicadoresBot',
      'Accept': 'text/html',
    },
  })

  if (!response.ok) {
    throw new Error(`Previred HTTP ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()

  // Parse UF — buscar patrón "$XX.XXX,XX"
  const ufMatch = html.match(/UF[\s\S]*?\$\s*([\d.]+,\d{2})/i)
  const uf = ufMatch ? parseChileanNumber(ufMatch[1]) : null

  // Parse UTM
  const utmMatch = html.match(/UTM[\s\S]*?\$\s*([\d.]+)/i)
  const utm = utmMatch ? parseChileanNumber(utmMatch[1]) : null

  // Parse Sueldo Mínimo TCP (Trabajadores de Casa Particular)
  const smMatch = html.match(/[Cc]asa\s+[Pp]articular[\s\S]*?\$\s*([\d.]+)/i)
  const sueldo_minimo_tcp = smMatch ? parseChileanNumber(smMatch[1]) : null

  // Parse Tope Imponible AFP
  const topeAfpMatch = html.match(/[Tt]ope\s+[Ii]mponible[\s\S]*?\$\s*([\d.]+)/i)
  const tope_afp = topeAfpMatch ? parseChileanNumber(topeAfpMatch[1]) : null

  // Parse AFP tasas — tabla con nombres de AFP y tasas
  const afp_tasas = parseAfpTasas(html)

  // Parse SIS
  const sisMatch = html.match(/SIS[\s\S]*?([\d]+[,.][\d]+)\s*%/i)
  const tasa_sis = sisMatch ? parseFloat(sisMatch[1].replace(',', '.')) / 100 : null

  const result: Partial<IndicadoresScraped> = { mes }

  if (uf !== null) result.uf = uf
  if (utm !== null) result.utm = utm
  if (sueldo_minimo_tcp !== null) result.sueldo_minimo_tcp = sueldo_minimo_tcp
  if (tope_afp !== null) result.tope_afp = tope_afp
  if (afp_tasas && Object.keys(afp_tasas).length > 0) result.afp_tasas = afp_tasas
  if (tasa_sis !== null) result.tasa_sis = tasa_sis

  return result
}

// ── Scraping SII (tramos IUSC) ──
async function scrapeSII(mes: string): Promise<Partial<IndicadoresScraped>> {
  // SII publica tabla de impuesto único de segunda categoría
  const [y, m] = mes.split('-')
  const url = `https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2da${y}.htm`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Gesti/3.1 IndicadoresBot',
      'Accept': 'text/html',
    },
  })

  if (!response.ok) {
    throw new Error(`SII HTTP ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()

  // Parse tramos IUSC del mes correspondiente
  const tramos_iusc = parseTramosIUSC(html, parseInt(m))
  const rli_exento_hasta = tramos_iusc.length > 0 ? tramos_iusc[0].rli_hasta : null

  const result: Partial<IndicadoresScraped> = { mes }
  if (tramos_iusc.length > 0) result.tramos_iusc = tramos_iusc
  if (rli_exento_hasta !== null) result.rli_exento_hasta = rli_exento_hasta

  return result
}

// ── Parsers auxiliares ──
function parseChileanNumber(str: string): number {
  // "$1.234.567" or "1.234,56" → 1234567 or 1234.56
  const cleaned = str.replace(/\$/g, '').replace(/\s/g, '').trim()
  // If has comma as decimal separator: "39.841,72" → "39841.72"
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  // Otherwise dots are thousands separators: "539.000" → 539000
  return parseFloat(cleaned.replace(/\./g, ''))
}

function parseAfpTasas(html: string): Record<string, AfpTasa> | null {
  const afps: Record<string, AfpTasa> = {}
  const nombres = ['Capital', 'Cuprum', 'Habitat', 'PlanVital', 'Provida', 'Modelo', 'Uno']

  for (const nombre of nombres) {
    // Match AFP name followed by percentage values
    const pattern = new RegExp(
      `${nombre}[\\s\\S]*?(\\d+[,.]\\d+)\\s*%[\\s\\S]*?(\\d+[,.]\\d+)\\s*%`,
      'i'
    )
    const match = html.match(pattern)
    if (match) {
      const cotizacion = parseFloat(match[1].replace(',', '.')) / 100
      const seguro = parseFloat(match[2].replace(',', '.')) / 100
      afps[nombre] = {
        tasa_obligatoria: cotizacion,
        tasa_seguro: seguro,
      }
    }
  }

  return Object.keys(afps).length > 0 ? afps : null
}

function parseTramosIUSC(html: string, mes: number): TramoIUSC[] {
  const tramos: TramoIUSC[] = []

  // SII tables have monthly columns; look for the target month's data
  // Typical table: "Desde" | "Hasta" | "Factor" | "Rebaja"
  // We look for rows with numeric data patterns
  const tablePattern = /(?:DESDE|Desde)[\s\S]*?(?:REBAJA|Rebaja)([\s\S]*?)(?:<\/table>|<\/TABLE>)/gi
  const tableMatch = tablePattern.exec(html)

  if (!tableMatch) return tramos

  const tableContent = tableMatch[1]
  // Extract rows with numeric patterns
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi
  let rowMatch

  while ((rowMatch = rowPattern.exec(tableContent)) !== null) {
    const row = rowMatch[0]
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    if (!cells || cells.length < 4) continue

    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim()

    const hasta = parseChileanNumber(stripHtml(cells[1]))
    const factor = parseFloat(stripHtml(cells[2]).replace(',', '.'))
    const rebaja = parseChileanNumber(stripHtml(cells[3]))

    if (!isNaN(hasta) && !isNaN(factor) && !isNaN(rebaja)) {
      tramos.push({
        rli_hasta: hasta === 0 ? Infinity : hasta,
        factor,
        rebaja,
      })
    }
  }

  return tramos
}

// ── Validación de rangos ──
function validarRangos(indicadores: Partial<IndicadoresScraped>): string[] {
  const errores: string[] = []

  if (indicadores.uf !== undefined) {
    if (indicadores.uf < RANGOS.uf.min || indicadores.uf > RANGOS.uf.max) {
      errores.push(`UF fuera de rango: ${indicadores.uf} (esperado ${RANGOS.uf.min}-${RANGOS.uf.max})`)
    }
  }

  if (indicadores.utm !== undefined) {
    if (indicadores.utm < RANGOS.utm.min || indicadores.utm > RANGOS.utm.max) {
      errores.push(`UTM fuera de rango: ${indicadores.utm} (esperado ${RANGOS.utm.min}-${RANGOS.utm.max})`)
    }
  }

  if (indicadores.sueldo_minimo_tcp !== undefined) {
    if (indicadores.sueldo_minimo_tcp < RANGOS.sueldo_minimo_tcp.min || indicadores.sueldo_minimo_tcp > RANGOS.sueldo_minimo_tcp.max) {
      errores.push(`Sueldo mínimo TCP fuera de rango: ${indicadores.sueldo_minimo_tcp}`)
    }
  }

  if (indicadores.afp_tasas) {
    for (const [afp, tasas] of Object.entries(indicadores.afp_tasas)) {
      if (tasas.tasa_obligatoria < RANGOS.tasa_afp.min || tasas.tasa_obligatoria > RANGOS.tasa_afp.max) {
        errores.push(`AFP ${afp} tasa fuera de rango: ${tasas.tasa_obligatoria}`)
      }
    }
  }

  if (indicadores.tasa_sis !== undefined) {
    if (indicadores.tasa_sis < RANGOS.tasa_sis.min || indicadores.tasa_sis > RANGOS.tasa_sis.max) {
      errores.push(`SIS fuera de rango: ${indicadores.tasa_sis}`)
    }
  }

  return errores
}

// ── Enviar email de alerta al admin ──
async function enviarAlertaAdmin(
  asunto: string,
  detalle: string,
  mes: string,
  useFallback: boolean
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@gesti.cl'

  if (!resendApiKey) {
    console.error('RESEND_API_KEY no configurada, no se puede enviar alerta')
    return
  }

  const body = {
    from: 'Gesti <noreply@gesti.cl>',
    to: [adminEmail],
    subject: `[Gesti] Alerta Indicadores ${mes}: ${asunto}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #135e5f;">Alerta de Actualización de Indicadores</h2>
        <p><strong>Mes:</strong> ${mes}</p>
        <p><strong>Problema:</strong> ${asunto}</p>
        <pre style="background: #f4f4f9; padding: 16px; border-radius: 8px; overflow-x: auto;">${detalle}</pre>
        ${useFallback ? '<p style="color: #d97706;"><strong>Acción tomada:</strong> Se usaron los indicadores del mes anterior como fallback.</p>' : ''}
        <p>Revise y actualice manualmente los indicadores si es necesario.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5;">
        <p style="font-size: 12px; color: #888;">Sistema automático Gesti v3.1</p>
      </div>
    `,
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Error enviando alerta:', await res.text())
    }
  } catch (err) {
    console.error('Error enviando alerta admin:', err)
  }
}

// ── Función principal ──
Deno.serve(async (req: Request) => {
  // Verify authorization
  const authHeader = req.headers.get('authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(
      JSON.stringify({ success: false, error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const mesActual = getMesActual()
  const mesAnterior = getMesAnterior(mesActual)

  console.log(`[update-indicadores] Iniciando actualización para ${mesActual}`)

  let previredData: Partial<IndicadoresScraped> = {}
  let siiData: Partial<IndicadoresScraped> = {}
  let erroresScraping: string[] = []
  let useFallback = false

  // ── Paso 1: Scraping ──
  try {
    previredData = await scrapePrevired(mesActual)
    console.log('[update-indicadores] Previred OK:', Object.keys(previredData))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    erroresScraping.push(`Previred: ${msg}`)
    console.error('[update-indicadores] Error Previred:', msg)
  }

  try {
    siiData = await scrapeSII(mesActual)
    console.log('[update-indicadores] SII OK:', Object.keys(siiData))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    erroresScraping.push(`SII: ${msg}`)
    console.error('[update-indicadores] Error SII:', msg)
  }

  // Merge scraped data
  const scraped: Partial<IndicadoresScraped> = {
    mes: mesActual,
    ...previredData,
    ...siiData,
  }

  // ── Paso 2: Validar rangos ──
  const erroresValidacion = validarRangos(scraped)
  if (erroresValidacion.length > 0) {
    erroresScraping.push(...erroresValidacion.map(e => `Validación: ${e}`))
    console.warn('[update-indicadores] Errores de validación:', erroresValidacion)
  }

  // ── Paso 3: Determinar si datos son suficientes ──
  const camposRequeridos = ['uf', 'utm', 'sueldo_minimo_tcp', 'afp_tasas', 'tramos_iusc', 'tope_afp']
  const camposFaltantes = camposRequeridos.filter(
    c => scraped[c as keyof IndicadoresScraped] === undefined
  )

  // Si faltan campos críticos o hay errores de validación → fallback
  if (camposFaltantes.length > 0 || erroresValidacion.length > 0) {
    console.warn(`[update-indicadores] Campos faltantes: ${camposFaltantes.join(', ')}. Usando fallback.`)
    useFallback = true

    // ── HU-301: Fallback — usar mes anterior ──
    const { data: anterior, error: anteriorError } = await supabase
      .from('indicadores_previsionales')
      .select('*')
      .eq('mes', mesAnterior)
      .single()

    if (anteriorError || !anterior) {
      // No hay mes anterior — error crítico
      const errorMsg = `No se pudo obtener fallback del mes ${mesAnterior}: ${anteriorError?.message || 'no encontrado'}`
      console.error(`[update-indicadores] ${errorMsg}`)

      await enviarAlertaAdmin(
        'Fallo total — sin fallback',
        [...erroresScraping, errorMsg].join('\n'),
        mesActual,
        false
      )

      // Log fallo
      await supabase.from('indicadores_actualizacion_log').insert({
        mes_anterior: mesAnterior,
        mes_nuevo: mesActual,
        cambios: {
          status: 'fallido',
          errores: [...erroresScraping, errorMsg],
          fallback: false,
        },
        actualizado_por: 'edge-function:update-indicadores',
      })

      return new Response(
        JSON.stringify({ success: false, error: 'Scraping fallido y sin fallback disponible', errores: erroresScraping }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Upsert con datos del mes anterior pero mes actual
    const fallbackData = {
      mes: mesActual,
      uf: scraped.uf ?? anterior.uf,
      utm: scraped.utm ?? anterior.utm,
      sueldo_minimo_tcp: scraped.sueldo_minimo_tcp ?? anterior.sueldo_minimo_tcp,
      afp_tasas: scraped.afp_tasas ?? anterior.afp_tasas,
      tramos_iusc: scraped.tramos_iusc ?? anterior.tramos_iusc,
      tope_afp: scraped.tope_afp ?? anterior.tope_afp,
      tope_cesantia: scraped.tope_cesantia ?? anterior.tope_cesantia,
      tasa_sis: scraped.tasa_sis ?? anterior.tasa_sis,
      tasa_isl: scraped.tasa_isl ?? anterior.tasa_isl,
      tasa_indemnizacion: scraped.tasa_indemnizacion ?? anterior.tasa_indemnizacion,
      reforma: anterior.reforma,
      rli_exento_hasta: scraped.rli_exento_hasta ?? anterior.rli_exento_hasta,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('indicadores_previsionales')
      .upsert(fallbackData, { onConflict: 'mes' })

    if (upsertError) {
      console.error('[update-indicadores] Error upsert fallback:', upsertError.message)
    }

    // Log fallback
    await supabase.from('indicadores_actualizacion_log').insert({
      mes_anterior: mesAnterior,
      mes_nuevo: mesActual,
      cambios: {
        status: 'fallback',
        errores: erroresScraping,
        campos_faltantes: camposFaltantes,
        datos_parciales_scraping: Object.keys(scraped),
      },
      actualizado_por: 'edge-function:update-indicadores',
    })

    // HU-301: Email admin sobre fallback
    await enviarAlertaAdmin(
      'Scraping parcial — fallback aplicado',
      [
        `Errores: ${erroresScraping.join('; ')}`,
        `Campos faltantes: ${camposFaltantes.join(', ')}`,
        `Se usaron datos del mes ${mesAnterior} para los campos faltantes.`,
      ].join('\n'),
      mesActual,
      true
    )

    return new Response(
      JSON.stringify({
        success: true,
        fallback: true,
        mes: mesActual,
        mes_fallback: mesAnterior,
        errores: erroresScraping,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Paso 4: Upsert completo con datos scrapeados ──
  const indicadoresCompletos = {
    mes: mesActual,
    uf: scraped.uf!,
    utm: scraped.utm!,
    sueldo_minimo_tcp: scraped.sueldo_minimo_tcp!,
    afp_tasas: scraped.afp_tasas!,
    tramos_iusc: scraped.tramos_iusc!,
    tope_afp: scraped.tope_afp!,
    tope_cesantia: scraped.tope_cesantia ?? scraped.tope_afp! * 1.5, // estimate if missing
    tasa_sis: scraped.tasa_sis ?? 0.0154,
    tasa_isl: scraped.tasa_isl ?? 0.0093,
    tasa_indemnizacion: scraped.tasa_indemnizacion ?? 0.0111,
    reforma: scraped.reforma ?? {
      cap_individual_afp: 0.001,
      expectativa_vida: 0.009,
      rentabilidad_protegida: 0,
      ley_sanna: 0.003,
    },
    rli_exento_hasta: scraped.rli_exento_hasta!,
    updated_at: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase
    .from('indicadores_previsionales')
    .upsert(indicadoresCompletos, { onConflict: 'mes' })

  if (upsertError) {
    console.error('[update-indicadores] Error upsert:', upsertError.message)

    await supabase.from('indicadores_actualizacion_log').insert({
      mes_anterior: mesAnterior,
      mes_nuevo: mesActual,
      cambios: {
        status: 'fallido',
        errores: [`Upsert DB: ${upsertError.message}`],
      },
      actualizado_por: 'edge-function:update-indicadores',
    })

    return new Response(
      JSON.stringify({ success: false, error: upsertError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Paso 5: Log éxito ──
  // Obtener datos anteriores para comparar
  const { data: anterior } = await supabase
    .from('indicadores_previsionales')
    .select('uf, utm, sueldo_minimo_tcp')
    .eq('mes', mesAnterior)
    .single()

  const cambios: Record<string, { anterior: number; nuevo: number }> = {}
  if (anterior) {
    if (anterior.uf !== indicadoresCompletos.uf) {
      cambios.uf = { anterior: anterior.uf, nuevo: indicadoresCompletos.uf }
    }
    if (anterior.utm !== indicadoresCompletos.utm) {
      cambios.utm = { anterior: anterior.utm, nuevo: indicadoresCompletos.utm }
    }
    if (anterior.sueldo_minimo_tcp !== indicadoresCompletos.sueldo_minimo_tcp) {
      cambios.sueldo_minimo_tcp = {
        anterior: anterior.sueldo_minimo_tcp,
        nuevo: indicadoresCompletos.sueldo_minimo_tcp,
      }
    }
  }

  await supabase.from('indicadores_actualizacion_log').insert({
    mes_anterior: mesAnterior,
    mes_nuevo: mesActual,
    cambios: {
      status: 'ok',
      cambios_detectados: cambios,
    },
    actualizado_por: 'edge-function:update-indicadores',
  })

  console.log(`[update-indicadores] Actualización exitosa para ${mesActual}`)

  return new Response(
    JSON.stringify({
      success: true,
      mes: mesActual,
      cambios,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
