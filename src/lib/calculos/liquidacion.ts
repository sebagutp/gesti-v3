// ============================================================
// Motor de Liquidación v3.1 — Gesti (Rama B)
// Art. 42 N°1 DL 824: IUSC sobre RLI, NUNCA sobre bruto
// ============================================================

import type {
  InputLiquidacion,
  ResultadoLiquidacion,
  IndicadoresPrevisionales,
  TramoIUSC,
} from '../types/liquidacion'
import { validarInput } from './validaciones'

// ============================================================
// Indicadores por defecto — Marzo 2026
// ============================================================
export const INDICADORES_MARZO_2026: IndicadoresPrevisionales = {
  id: 'default-2026-03',
  mes: '2026-03',
  uf: 39841.72,
  utm: 69889,
  sueldo_minimo_tcp: 539000,

  afp_tasas: {
    Capital:  { tasa_obligatoria: 0.1144, tasa_seguro: 0.0144 },
    Cuprum:   { tasa_obligatoria: 0.1144, tasa_seguro: 0.0144 },
    Habitat:  { tasa_obligatoria: 0.1127, tasa_seguro: 0.0127 },
    PlanVital: { tasa_obligatoria: 0.1116, tasa_seguro: 0.0116 },
    Provida:  { tasa_obligatoria: 0.1145, tasa_seguro: 0.0145 },
    Modelo:   { tasa_obligatoria: 0.1058, tasa_seguro: 0.0058 },
    Uno:      { tasa_obligatoria: 0.1046, tasa_seguro: 0.0147 },
  },

  tramos_iusc: [
    { rli_hasta: 943501,   factor: 0,     rebaja: 0 },
    { rli_hasta: 2096670,  factor: 0.04,  rebaja: 37740 },
    { rli_hasta: 3494450,  factor: 0.08,  rebaja: 121607 },
    { rli_hasta: 5230180,  factor: 0.135, rebaja: 380520 },
    { rli_hasta: 7464530,  factor: 0.23,  rebaja: 1106970 },
    { rli_hasta: 9927240,  factor: 0.304, rebaja: 1769340 },
    { rli_hasta: Infinity, factor: 0.37,  rebaja: 2684460 },
  ],

  tope_afp: 3585755,
  tope_cesantia: 5386601,

  tasas: {
    sis: 0.0154,
    isl: 0.0093,
    indemnizacion: 0.0111,
    cesantia_tcp: 0.03,
  },

  reforma: {
    cap_individual_afp: 0.001,
    expectativa_vida: 0.009,
    rentabilidad_protegida: 0,
  },

  rli_exento_hasta: 943501,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

// ============================================================
// Paso 8: Calcular IUSC sobre RLI — Art. 42 N°1 DL 824
// NUNCA sobre bruto
// ============================================================
export function calcularIUSC(rli: number, tramos: TramoIUSC[]): number {
  if (rli <= 0) return 0

  for (const tramo of tramos) {
    if (rli <= tramo.rli_hasta) {
      return Math.max(0, Math.round(rli * tramo.factor - tramo.rebaja))
    }
  }

  const ultimo = tramos[tramos.length - 1]
  return Math.max(0, Math.round(rli * ultimo.factor - ultimo.rebaja))
}

// ============================================================
// Asignación Familiar — 4 tramos por número de cargas
// ============================================================
function calcularAsignacionFamiliar(cargas: number, uf: number): number {
  if (!cargas || cargas <= 0) return 0

  let factor: number
  if (cargas <= 2) factor = 0.25
  else if (cargas <= 4) factor = 0.20
  else if (cargas <= 6) factor = 0.15
  else factor = 0.10

  return Math.round(cargas * uf * factor)
}

// ============================================================
// Horas extra (50% recargo sobre valor hora)
// ============================================================
function calcularHorasExtra(sueldoBase: number, horas: number): number {
  if (!horas || horas <= 0) return 0
  const valorHora = sueldoBase / 30 / 8
  return Math.round(horas * valorHora * 1.5)
}

// ============================================================
// Resolver Bruto desde Neto (Bisección)
//
// "Sueldo líquido pactado" en Chile = bruto − AFP − Salud
// El IUSC es obligación del trabajador y se descuenta DESPUÉS.
// La bisección resuelve: bruto − AFP(bruto) − Salud(bruto) = pactado
// ============================================================
export function resolverBrutoDesdeNeto(
  sueldoPactado: number,
  tasaAFP: number,
  topeAFP: number,
): number {
  let bajo = sueldoPactado
  let alto = sueldoPactado * 3
  const tolerancia = 1

  for (let i = 0; i < 100; i++) {
    if (alto - bajo <= tolerancia) break

    const mid = Math.floor((bajo + alto) / 2)
    const baseAfp = Math.min(mid, topeAFP)
    const afp = Math.round(baseAfp * tasaAFP)
    const salud = Math.round(mid * 0.07)
    const netoPrevioIusc = mid - afp - salud

    if (netoPrevioIusc < sueldoPactado) {
      bajo = mid
    } else {
      alto = mid
    }
  }

  return Math.round(alto)
}

// ============================================================
// Motor Principal — calcularLiquidacion (11 pasos)
// ============================================================
export function calcularLiquidacion(
  input: InputLiquidacion,
  indicadores: IndicadoresPrevisionales = INDICADORES_MARZO_2026,
): ResultadoLiquidacion {
  const errores = validarInput(input, indicadores)

  // ── Paso 1: Obtener tasa AFP ──
  const afpData = indicadores.afp_tasas[input.afp]
  const tasaAFP = afpData?.tasa_obligatoria ?? 0

  // ── Paso 2: Determinar sueldo bruto mensual ──
  let brutoMensual: number

  if (input.tipo_sueldo === 'liquido') {
    brutoMensual = resolverBrutoDesdeNeto(
      input.sueldo_base,
      tasaAFP,
      indicadores.tope_afp,
    )
  } else {
    brutoMensual = input.sueldo_base
  }

  // ── Paso 3: Ajustar por días trabajados y horas extra ──
  const diasTrabajados = input.dias_trabajados
  const factorDias = diasTrabajados / 30

  const sueldoBaseAjustado = Math.round(brutoMensual * factorDias)
  const horasExtraMonto = calcularHorasExtra(brutoMensual, input.horas_extra ?? 0)
  const gratificacion = Math.round((input.gratificacion ?? 0) * factorDias)

  // Total imponible (base para cotizaciones del trabajador)
  const totalImponible = sueldoBaseAjustado + horasExtraMonto + gratificacion

  // ── Paso 4: AFP del trabajador ──
  const baseAfpTrabajador = Math.min(totalImponible, indicadores.tope_afp)
  const afpTrabajador = Math.round(baseAfpTrabajador * tasaAFP)

  // ── Paso 5: Salud del trabajador (7% fijo) ──
  const saludTrabajador = Math.round(totalImponible * 0.07)

  // ── Paso 6: APV ──
  const apvMonto = input.apv_monto ?? 0
  const apvRegimen = input.apv_regimen ?? 'A'
  const topeAPV = Math.round(50 * indicadores.uf)
  const apvEfectivo = Math.min(apvMonto, topeAPV)
  const apvB = apvRegimen === 'B' ? apvEfectivo : 0

  // ── Paso 7: Calcular RLI ──
  // REGLA CRÍTICA: RLI = Imponible − AFP − Salud − APV_B
  const rli = totalImponible - afpTrabajador - saludTrabajador - apvB

  // ── Paso 8: IUSC sobre RLI ──
  const iusc = calcularIUSC(rli, indicadores.tramos_iusc)

  // ── Paso 9: Cesantía TCP = $0 trabajador SIEMPRE ──
  const cesantiaTrabajador = 0

  // ── Paso 10: Asignación familiar ──
  const asignacionFamiliar = calcularAsignacionFamiliar(
    input.cargas_familiares ?? 0,
    indicadores.uf,
  )

  // ── Haberes no imponibles ──
  const colacion = input.colacion ?? 0
  const movilizacion = input.movilizacion ?? 0
  const otrosBonos = input.otros_bonos ?? 0
  const anticipo = input.anticipo ?? 0

  // ── Totales haberes ──
  const totalHaberes =
    sueldoBaseAjustado + gratificacion + colacion +
    movilizacion + horasExtraMonto + asignacionFamiliar + otrosBonos

  // ── Total descuentos trabajador ──
  const totalDescuentos =
    afpTrabajador + saludTrabajador + cesantiaTrabajador +
    iusc + anticipo + apvEfectivo

  // ── Líquido ──
  const liquido = totalHaberes - totalDescuentos

  // ── Paso 11: Cotizaciones empleador ──
  const baseCotizEmpleador = Math.min(totalImponible, indicadores.tope_cesantia)
  const baseAfpEmpleador = Math.min(totalImponible, indicadores.tope_afp)
  const esPensionado = input.es_pensionado

  const sis = Math.round(baseAfpEmpleador * indicadores.tasas.sis)
  const isl = Math.round(baseCotizEmpleador * indicadores.tasas.isl)
  const indemnizacion = Math.round(baseCotizEmpleador * indicadores.tasas.indemnizacion)
  const cesantiaEmpleador = Math.round(baseCotizEmpleador * indicadores.tasas.cesantia_tcp)

  // Reforma previsional — pensionados exentos
  const afpEmpleador = esPensionado
    ? 0
    : Math.round(baseAfpEmpleador * indicadores.reforma.cap_individual_afp)
  const expectativaVida = esPensionado
    ? 0
    : Math.round(baseAfpEmpleador * indicadores.reforma.expectativa_vida)
  const rentabilidadProtegida = esPensionado
    ? 0
    : Math.round(baseAfpEmpleador * indicadores.reforma.rentabilidad_protegida)

  const totalCotizaciones =
    sis + isl + indemnizacion + cesantiaEmpleador +
    afpEmpleador + expectativaVida + rentabilidadProtegida

  // ── Costos empleador ──
  const costoTotal = totalImponible + totalCotizaciones
  const totalEmpleador = costoTotal + colacion + movilizacion + otrosBonos

  // ── Resultado ──
  return {
    haberes: {
      sueldo_base: sueldoBaseAjustado,
      gratificacion,
      colacion,
      movilizacion,
      horas_extra: horasExtraMonto,
      asignacion_familiar: asignacionFamiliar,
      otros_bonos: otrosBonos,
      total_haberes: totalHaberes,
    },
    descuentos_trabajador: {
      afp: afpTrabajador,
      salud: saludTrabajador,
      cesantia: cesantiaTrabajador,
      iusc,
      anticipo,
      apv: apvEfectivo,
      total_descuentos: totalDescuentos,
    },
    cotizaciones_empleador: {
      sis,
      accidentes: isl,
      indemnizacion,
      cesantia: cesantiaEmpleador,
      afp_empleador: afpEmpleador,
      expectativa_vida: expectativaVida,
      rentabilidad_protegida: rentabilidadProtegida,
      total_cotizaciones: totalCotizaciones,
    },
    totales: {
      bruto: totalImponible,
      total_imponible: totalImponible,
      total_descuentos: totalDescuentos,
      liquido,
      total_empleador: totalEmpleador,
      costo_total: costoTotal,
    },
    meta: {
      motor_version: 'v3.1',
      periodo: indicadores.mes,
      indicadores_usados: {
        uf: indicadores.uf,
        utm: indicadores.utm,
        sueldo_minimo_tcp: indicadores.sueldo_minimo_tcp,
      },
      rli_calculado: rli,
      errores: errores.length > 0 ? errores : undefined,
    },
  }
}
