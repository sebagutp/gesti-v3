#!/usr/bin/env npx tsx
// ============================================================
// Script Migración V2 → V3.1 — Gesti
// Lee datos desde Google Sheets (CSV export) y hace upsert en Supabase
// Usage: npx tsx src/scripts/migrate-v2.ts [--dry-run] [--sheet-contratos URL] [--sheet-liquidaciones URL]
// ============================================================

import { createClient } from '@supabase/supabase-js'

// ── Config ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface CliArgs {
  dryRun: boolean
  sheetContratos: string
  sheetLiquidaciones: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const flags: CliArgs = {
    dryRun: args.includes('--dry-run'),
    sheetContratos: '',
    sheetLiquidaciones: '',
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sheet-contratos' && args[i + 1]) flags.sheetContratos = args[i + 1]
    if (args[i] === '--sheet-liquidaciones' && args[i + 1]) flags.sheetLiquidaciones = args[i + 1]
  }
  return flags
}

// ── Logging ─────────────────────────────────────────────────
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'OK'
function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString()
  const prefix = { INFO: '📋', WARN: '⚠️', ERROR: '❌', OK: '✅' }[level]
  console.log(`[${ts}] ${prefix} ${level}: ${msg}`)
  if (data) console.log('  ', JSON.stringify(data, null, 2))
}

// ── Validation ──────────────────────────────────────────────
function validarRut(rut: string): boolean {
  if (!rut) return false
  const cleaned = rut.replace(/[.\-]/g, '').toUpperCase()
  if (cleaned.length < 2) return false
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  if (!/^\d+$/.test(body)) return false
  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const expected = 11 - (sum % 11)
  const dvExpected = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return dv === dvExpected
}

function validarFecha(fecha: string): boolean {
  if (!fecha) return false
  const d = new Date(fecha)
  return !isNaN(d.getTime())
}

function validarMonto(monto: unknown): boolean {
  const n = Number(monto)
  return !isNaN(n) && n >= 0
}

function formatRut(rut: string): string {
  return rut.replace(/[.\s]/g, '').replace(/^(\d+)-?([\dkK])$/, '$1-$2').toUpperCase()
}

// ── CSV Parsing ─────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

// ── Mapping V2 → V3 ────────────────────────────────────────
interface V2Contrato {
  rut_empleador: string
  nombre_empleador: string
  email_empleador: string
  rut_trabajador: string
  nombre_trabajador: string
  apellidos_trabajador: string
  email_trabajador: string
  domicilio_trabajador: string
  tipo_contrato: string
  tipo_jornada: string
  sueldo: string
  tipo_sueldo: string
  afp: string
  fecha_inicio: string
  fecha_termino: string
  colacion: string
  movilizacion: string
  user_email: string
}

interface V2Liquidacion {
  rut_trabajador: string
  periodo: string
  sueldo_base: string
  dias_trabajados: string
  dias_licencia: string
  horas_extra: string
  anticipo: string
  otros_bonos: string
  total_haberes: string
  total_descuentos: string
  liquido: string
  user_email: string
}

function mapContrato(v2: V2Contrato, userId: string) {
  return {
    user_id: userId,
    razon_social: v2.nombre_empleador || 'Persona Natural',
    rut_empresa: formatRut(v2.rut_empleador),
    nombre_empleador: v2.nombre_empleador,
    email_empleador: v2.email_empleador,
    nombre_trabajador: v2.nombre_trabajador,
    apellidos_trabajador: v2.apellidos_trabajador,
    tipo_documento: 'rut' as const,
    numero_documento: formatRut(v2.rut_trabajador),
    email_trabajador: v2.email_trabajador || '',
    domicilio_trabajador: v2.domicilio_trabajador || '',
    tipo_contrato: mapTipoContrato(v2.tipo_contrato),
    tipo_jornada: mapTipoJornada(v2.tipo_jornada),
    sueldo_base: Number(v2.sueldo) || 0,
    tipo_sueldo: mapTipoSueldo(v2.tipo_sueldo),
    afp: v2.afp || 'Modelo',
    fecha_inicio: v2.fecha_inicio,
    fecha_termino: v2.fecha_termino || null,
    gratificacion: false,
    colacion: Number(v2.colacion) || 0,
    movilizacion: Number(v2.movilizacion) || 0,
    estado: 'activo',
    vigente: true,
  }
}

function mapTipoContrato(v2: string): string {
  const lower = (v2 || '').toLowerCase()
  if (lower.includes('adentro')) return 'puertas_adentro'
  return 'puertas_afuera'
}

function mapTipoJornada(v2: string): string {
  const lower = (v2 || '').toLowerCase()
  if (lower.includes('parcial') || lower.includes('part')) return 'part'
  return 'full'
}

function mapTipoSueldo(v2: string): string {
  const lower = (v2 || '').toLowerCase()
  if (lower.includes('liquido') || lower.includes('líquido')) return 'liquido'
  if (lower.includes('bruto')) return 'bruto'
  return 'imponible'
}

function mapLiquidacion(v2: V2Liquidacion, contratoId: string, userId: string) {
  const calculo = {
    haberes: {
      sueldo_base: Number(v2.sueldo_base) || 0,
      gratificacion: 0,
      colacion: 0,
      movilizacion: 0,
      horas_extra: 0,
      asignacion_familiar: 0,
      otros_bonos: Number(v2.otros_bonos) || 0,
      total_haberes: Number(v2.total_haberes) || 0,
    },
    descuentos_trabajador: {
      afp: 0,
      salud: 0,
      cesantia: 0,
      iusc: 0,
      anticipo: Number(v2.anticipo) || 0,
      apv: 0,
      total_descuentos: Number(v2.total_descuentos) || 0,
    },
    cotizaciones_empleador: {
      sis: 0, accidentes: 0, indemnizacion: 0, cesantia: 0,
      afp_empleador: 0, expectativa_vida: 0, rentabilidad_protegida: 0,
      total_cotizaciones: 0,
    },
    totales: {
      bruto: Number(v2.total_haberes) || 0,
      total_imponible: Number(v2.sueldo_base) || 0,
      total_descuentos: Number(v2.total_descuentos) || 0,
      liquido: Number(v2.liquido) || 0,
      total_empleador: 0,
      costo_total: 0,
    },
    meta: {
      motor_version: 'v2-migrated' as const,
      periodo: v2.periodo,
      indicadores_usados: { uf: 0, utm: 0, sueldo_minimo_tcp: 0 },
      rli_calculado: 0,
    },
  }

  return {
    contrato_id: contratoId,
    user_id: userId,
    periodo: v2.periodo,
    estado: 'pagada',
    dias_trabajados: Number(v2.dias_trabajados) || 30,
    dias_licencia_medica: Number(v2.dias_licencia) || 0,
    horas_extra: Number(v2.horas_extra) || 0,
    anticipo: Number(v2.anticipo) || 0,
    otros_bonos: Number(v2.otros_bonos) || 0,
    calculo,
  }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const args = parseArgs()
  log('INFO', `Migración V2 → V3.1 iniciada${args.dryRun ? ' (DRY RUN — no se escribirá nada)' : ''}`)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('ERROR', 'Variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas')
    process.exit(1)
  }

  if (!args.sheetContratos && !args.sheetLiquidaciones) {
    log('ERROR', 'Debe especificar al menos --sheet-contratos o --sheet-liquidaciones con URL de Google Sheets (CSV export)')
    log('INFO', 'Uso: npx tsx src/scripts/migrate-v2.ts --dry-run --sheet-contratos "URL" --sheet-liquidaciones "URL"')
    log('INFO', 'Las URLs deben ser exportación CSV de Google Sheets: ...?output=csv')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stats = {
    contratos: { total: 0, ok: 0, skip: 0, error: 0 },
    liquidaciones: { total: 0, ok: 0, skip: 0, error: 0 },
  }

  // ── Resolve user emails → user_ids ──
  const userCache = new Map<string, string>()
  async function resolveUserId(email: string): Promise<string | null> {
    if (userCache.has(email)) return userCache.get(email)!
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()
    if (data) {
      userCache.set(email, data.id)
      return data.id
    }
    return null
  }

  // ── Contratos ─────────────────────────────────────────────
  if (args.sheetContratos) {
    log('INFO', 'Descargando CSV de contratos...')
    const resp = await fetch(args.sheetContratos)
    if (!resp.ok) {
      log('ERROR', `No se pudo descargar CSV de contratos: ${resp.status}`)
      process.exit(1)
    }
    const csv = await resp.text()
    const rows = parseCSV(csv) as unknown as V2Contrato[]
    stats.contratos.total = rows.length
    log('INFO', `Filas de contratos encontradas: ${rows.length}`)

    // Cache de contratos insertados: rut_trabajador → contrato_id
    const contratoCache = new Map<string, string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const idx = i + 1
      const errors: string[] = []

      // Validaciones
      if (row.rut_empleador && !validarRut(row.rut_empleador)) {
        errors.push(`RUT empleador inválido: ${row.rut_empleador}`)
      }
      if (row.rut_trabajador && !validarRut(row.rut_trabajador)) {
        errors.push(`RUT trabajador inválido: ${row.rut_trabajador}`)
      }
      if (!row.nombre_trabajador) {
        errors.push('nombre_trabajador vacío')
      }
      if (row.fecha_inicio && !validarFecha(row.fecha_inicio)) {
        errors.push(`Fecha inicio inválida: ${row.fecha_inicio}`)
      }
      if (row.sueldo && !validarMonto(row.sueldo)) {
        errors.push(`Sueldo inválido: ${row.sueldo}`)
      }

      if (errors.length > 0) {
        log('WARN', `Fila ${idx} tiene errores de validación, se omite`, { errors })
        stats.contratos.skip++
        continue
      }

      // Resolver user_id por email
      const userId = await resolveUserId(row.user_email)
      if (!userId) {
        log('WARN', `Fila ${idx}: usuario no encontrado para email=${row.user_email}, se omite`)
        stats.contratos.skip++
        continue
      }

      const mapped = mapContrato(row, userId)

      if (args.dryRun) {
        log('INFO', `[DRY RUN] Fila ${idx}: insertaría contrato`, {
          nombre_trabajador: mapped.nombre_trabajador,
          rut: mapped.numero_documento,
          sueldo: mapped.sueldo_base,
        })
        stats.contratos.ok++
        continue
      }

      const { data, error } = await supabase
        .from('contratos')
        .upsert(mapped, { onConflict: 'user_id,numero_documento,fecha_inicio' as unknown as string })
        .select('id')
        .single()

      if (error) {
        log('ERROR', `Fila ${idx}: error al insertar contrato`, { error: error.message })
        stats.contratos.error++
      } else {
        contratoCache.set(formatRut(row.rut_trabajador), data.id)
        log('OK', `Fila ${idx}: contrato insertado id=${data.id}`)
        stats.contratos.ok++
      }
    }

    // Save contrato cache for liquidaciones
    if (args.sheetLiquidaciones) {
      log('INFO', `Contratos en cache para vincular liquidaciones: ${contratoCache.size}`)
    }
  }

  // ── Liquidaciones ─────────────────────────────────────────
  if (args.sheetLiquidaciones) {
    log('INFO', 'Descargando CSV de liquidaciones...')
    const resp = await fetch(args.sheetLiquidaciones)
    if (!resp.ok) {
      log('ERROR', `No se pudo descargar CSV de liquidaciones: ${resp.status}`)
      process.exit(1)
    }
    const csv = await resp.text()
    const rows = parseCSV(csv) as unknown as V2Liquidacion[]
    stats.liquidaciones.total = rows.length
    log('INFO', `Filas de liquidaciones encontradas: ${rows.length}`)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const idx = i + 1
      const errors: string[] = []

      // Validaciones
      if (!row.periodo || !/^\d{4}-\d{2}$/.test(row.periodo)) {
        errors.push(`Periodo inválido: ${row.periodo}`)
      }
      if (row.sueldo_base && !validarMonto(row.sueldo_base)) {
        errors.push(`Sueldo base inválido: ${row.sueldo_base}`)
      }
      if (row.liquido && !validarMonto(row.liquido)) {
        errors.push(`Líquido inválido: ${row.liquido}`)
      }

      if (errors.length > 0) {
        log('WARN', `Fila ${idx} liquidación tiene errores, se omite`, { errors })
        stats.liquidaciones.skip++
        continue
      }

      // Resolver user_id
      const userId = await resolveUserId(row.user_email)
      if (!userId) {
        log('WARN', `Fila ${idx}: usuario no encontrado para email=${row.user_email}, se omite`)
        stats.liquidaciones.skip++
        continue
      }

      // Resolver contrato_id por rut_trabajador
      const rut = formatRut(row.rut_trabajador)
      let contratoId: string | null = null

      // Try cache first, then DB
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id')
        .eq('user_id', userId)
        .eq('numero_documento', rut)
        .limit(1)

      if (contratos && contratos.length > 0) {
        contratoId = contratos[0].id
      }

      if (!contratoId) {
        log('WARN', `Fila ${idx}: contrato no encontrado para rut=${rut}, se omite`)
        stats.liquidaciones.skip++
        continue
      }

      const mapped = mapLiquidacion(row, contratoId, userId)

      if (args.dryRun) {
        log('INFO', `[DRY RUN] Fila ${idx}: insertaría liquidación`, {
          periodo: mapped.periodo,
          rut_trabajador: rut,
          liquido: mapped.calculo.totales.liquido,
        })
        stats.liquidaciones.ok++
        continue
      }

      const { error } = await supabase
        .from('liquidaciones')
        .upsert(mapped, { onConflict: 'contrato_id,periodo' as unknown as string })

      if (error) {
        log('ERROR', `Fila ${idx}: error al insertar liquidación`, { error: error.message })
        stats.liquidaciones.error++
      } else {
        log('OK', `Fila ${idx}: liquidación insertada periodo=${mapped.periodo}`)
        stats.liquidaciones.ok++
      }
    }
  }

  // ── Resumen ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  log('INFO', 'RESUMEN DE MIGRACIÓN')
  console.log('='.repeat(60))
  if (args.dryRun) {
    console.log('⚡ MODO DRY RUN — No se escribió nada en la base de datos')
  }
  console.log(`\nContratos:`)
  console.log(`  Total filas:    ${stats.contratos.total}`)
  console.log(`  Insertados:     ${stats.contratos.ok}`)
  console.log(`  Omitidos:       ${stats.contratos.skip}`)
  console.log(`  Errores:        ${stats.contratos.error}`)
  console.log(`\nLiquidaciones:`)
  console.log(`  Total filas:    ${stats.liquidaciones.total}`)
  console.log(`  Insertadas:     ${stats.liquidaciones.ok}`)
  console.log(`  Omitidas:       ${stats.liquidaciones.skip}`)
  console.log(`  Errores:        ${stats.liquidaciones.error}`)
  console.log()

  if (stats.contratos.error > 0 || stats.liquidaciones.error > 0) {
    log('WARN', 'Hubo errores durante la migración. Revise el log arriba.')
    process.exit(1)
  }

  log('OK', 'Migración completada exitosamente.')
}

main().catch(err => {
  log('ERROR', 'Error fatal en migración', { error: String(err) })
  process.exit(1)
})
