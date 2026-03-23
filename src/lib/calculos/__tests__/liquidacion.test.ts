// ============================================================
// Tests Motor Liquidación v3.1 — HU-111 (7 casos obligatorios)
// AFP Uno, Marzo 2026
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calcularLiquidacion,
  calcularIUSC,
  resolverBrutoDesdeNeto,
  obtenerTasasReforma,
  INDICADORES_MARZO_2026,
} from '../liquidacion'
import type { InputLiquidacion } from '../../types/liquidacion'

const IND = INDICADORES_MARZO_2026

// Helper: input base sin extras (AFP Uno, 30 días, sin APV/licencia/cargas)
function inputBase(sueldo: number, tipo: 'liquido' | 'bruto' = 'liquido'): InputLiquidacion {
  return {
    sueldo_base: sueldo,
    tipo_sueldo: tipo,
    afp: 'Uno',
    es_pensionado: false,
    dias_trabajados: 30,
  }
}

// ============================================================
// Caso 1: $500K líquido → Bruto $605.767, IUSC $0, Líquido $500K
// ============================================================
describe('Caso 1: $500K líquido — exento IUSC', () => {
  const resultado = calcularLiquidacion(inputBase(500_000))

  it('bruto = $605.767', () => {
    expect(resultado.totales.bruto).toBe(605_767)
  })

  it('AFP = $63.363', () => {
    expect(resultado.descuentos_trabajador.afp).toBe(63_363)
  })

  it('Salud = $42.404', () => {
    expect(resultado.descuentos_trabajador.salud).toBe(42_404)
  })

  it('RLI = $500.000 (exento)', () => {
    expect(resultado.meta.rli_calculado).toBe(500_000)
  })

  it('IUSC = $0', () => {
    expect(resultado.descuentos_trabajador.iusc).toBe(0)
  })

  it('Líquido = $500.000', () => {
    expect(resultado.totales.liquido).toBe(500_000)
  })

  it('motor_version = v3.1', () => {
    expect(resultado.meta.motor_version).toBe('v3.1')
  })
})

// ============================================================
// Caso 2: $1M líquido → Bruto $1.211.533, IUSC $2.260, Líquido $997.740
// ============================================================
describe('Caso 2: $1M líquido — tramo 2 IUSC', () => {
  const resultado = calcularLiquidacion(inputBase(1_000_000))

  it('bruto = $1.211.533', () => {
    expect(resultado.totales.bruto).toBe(1_211_533)
  })

  it('AFP = $126.726', () => {
    expect(resultado.descuentos_trabajador.afp).toBe(126_726)
  })

  it('Salud = $84.807', () => {
    expect(resultado.descuentos_trabajador.salud).toBe(84_807)
  })

  it('RLI = $1.000.000', () => {
    expect(resultado.meta.rli_calculado).toBe(1_000_000)
  })

  it('IUSC = $2.260', () => {
    expect(resultado.descuentos_trabajador.iusc).toBe(2_260)
  })

  it('Líquido = $997.740', () => {
    expect(resultado.totales.liquido).toBe(997_740)
  })
})

// ============================================================
// Caso 3: $1.5M líquido → Bruto $1.817.301, IUSC $22.260, Líquido $1.477.740
// ============================================================
describe('Caso 3: $1.5M líquido — tramo 2 IUSC alto', () => {
  const resultado = calcularLiquidacion(inputBase(1_500_000))

  it('bruto = $1.817.301', () => {
    expect(resultado.totales.bruto).toBe(1_817_301)
  })

  it('AFP = $190.090', () => {
    expect(resultado.descuentos_trabajador.afp).toBe(190_090)
  })

  it('Salud = $127.211', () => {
    expect(resultado.descuentos_trabajador.salud).toBe(127_211)
  })

  it('RLI = $1.500.000', () => {
    expect(resultado.meta.rli_calculado).toBe(1_500_000)
  })

  it('IUSC = $22.260', () => {
    expect(resultado.descuentos_trabajador.iusc).toBe(22_260)
  })

  it('Líquido = $1.477.740', () => {
    expect(resultado.totales.liquido).toBe(1_477_740)
  })
})

// ============================================================
// Caso 4: $2M líquido — bisección, RLI cruza tramo 2
// ============================================================
describe('Caso 4: $2M líquido — bisección con IUSC tramo 2', () => {
  const resultado = calcularLiquidacion(inputBase(2_000_000))

  it('bruto resuelto correctamente por bisección', () => {
    // bruto debe ser tal que bruto - AFP - Salud = $2M
    const bruto = resultado.totales.bruto
    const afp = resultado.descuentos_trabajador.afp
    const salud = resultado.descuentos_trabajador.salud
    expect(bruto - afp - salud).toBe(2_000_000)
  })

  it('RLI = $2.000.000', () => {
    expect(resultado.meta.rli_calculado).toBe(2_000_000)
  })

  it('IUSC en tramo 2 (RLI entre $943.501 y $2.096.670)', () => {
    const iusc = resultado.descuentos_trabajador.iusc
    // IUSC = 2.000.000 * 0.04 - 37.740 = 42.260
    expect(iusc).toBe(42_260)
  })

  it('Líquido = $2M - IUSC', () => {
    expect(resultado.totales.liquido).toBe(2_000_000 - 42_260)
  })

  it('motor_version = v3.1', () => {
    expect(resultado.meta.motor_version).toBe('v3.1')
  })
})

// ============================================================
// Caso 5: Pensionado — cotizaciones reforma = $0
// ============================================================
describe('Caso 5: Pensionado — reforma exenta', () => {
  const input: InputLiquidacion = {
    ...inputBase(600_000, 'bruto'),
    es_pensionado: true,
  }
  const resultado = calcularLiquidacion(input)

  it('cotización capitalización individual AFP = $0', () => {
    expect(resultado.cotizaciones_empleador.afp_empleador).toBe(0)
  })

  it('cotización expectativa de vida = $0', () => {
    expect(resultado.cotizaciones_empleador.expectativa_vida).toBe(0)
  })

  it('cotización rentabilidad protegida = $0', () => {
    expect(resultado.cotizaciones_empleador.rentabilidad_protegida).toBe(0)
  })

  it('SIS e ISL SÍ aplican (no son reforma)', () => {
    expect(resultado.cotizaciones_empleador.sis).toBeGreaterThan(0)
    expect(resultado.cotizaciones_empleador.accidentes).toBeGreaterThan(0)
  })
})

// ============================================================
// Caso 6: Cesantía TCP — trabajador = $0
// ============================================================
describe('Caso 6: Cesantía TCP — trabajador siempre $0', () => {
  const resultado = calcularLiquidacion(inputBase(1_000_000))

  it('cesantía trabajador = $0', () => {
    expect(resultado.descuentos_trabajador.cesantia).toBe(0)
  })

  it('cesantía empleador = 3% sobre imponible', () => {
    const bruto = resultado.totales.bruto
    const esperado = Math.round(Math.min(bruto, IND.tope_cesantia) * 0.03)
    expect(resultado.cotizaciones_empleador.cesantia).toBe(esperado)
  })
})

// ============================================================
// Caso 7: Licencia 15 días con RIMA — prorrateo correcto
//
// RIMA prorrateo: cotiz = tasa × base × (diasTrab/30) + tasa × RIMA × (diasLic/30)
// Cuando RIMA == bruto, cotización total == cotización completa (100%)
// Cuando RIMA < bruto, cotización < 100%
// ============================================================
describe('Caso 7: Licencia 15 días — prorrateo con RIMA', () => {
  // Caso RIMA == bruto: cotizaciones deben ser iguales al caso completo
  const inputRimaIgual: InputLiquidacion = {
    sueldo_base: 600_000,
    tipo_sueldo: 'bruto',
    afp: 'Uno',
    es_pensionado: false,
    dias_trabajados: 15,
    dias_licencia_medica: 15,
    rima: 600_000,
  }
  const resultRimaIgual = calcularLiquidacion(inputRimaIgual)

  const inputCompleto: InputLiquidacion = {
    sueldo_base: 600_000,
    tipo_sueldo: 'bruto',
    afp: 'Uno',
    es_pensionado: false,
    dias_trabajados: 30,
  }
  const completo = calcularLiquidacion(inputCompleto)

  it('sueldo base ajustado = 50% del bruto', () => {
    expect(resultRimaIgual.haberes.sueldo_base).toBe(Math.round(600_000 * 0.5))
  })

  it('AFP con RIMA==bruto = cotización completa', () => {
    expect(resultRimaIgual.descuentos_trabajador.afp).toBe(
      completo.descuentos_trabajador.afp
    )
  })

  it('Salud con RIMA==bruto = cotización completa', () => {
    expect(resultRimaIgual.descuentos_trabajador.salud).toBe(
      completo.descuentos_trabajador.salud
    )
  })

  it('Cesantía empleador con RIMA==bruto = cotización completa', () => {
    expect(resultRimaIgual.cotizaciones_empleador.cesantia).toBe(
      completo.cotizaciones_empleador.cesantia
    )
  })

  // Caso RIMA < bruto: cotizaciones reducidas
  const inputRimaMenor: InputLiquidacion = {
    sueldo_base: 600_000,
    tipo_sueldo: 'bruto',
    afp: 'Uno',
    es_pensionado: false,
    dias_trabajados: 15,
    dias_licencia_medica: 15,
    rima: 400_000,
  }
  const resultRimaMenor = calcularLiquidacion(inputRimaMenor)

  it('AFP con RIMA < bruto: menor que caso completo', () => {
    expect(resultRimaMenor.descuentos_trabajador.afp).toBeLessThan(
      completo.descuentos_trabajador.afp
    )
    // AFP = 0.1046 * 600000 * 15/30 + 0.1046 * 400000 * 15/30
    // = 0.1046 * 300000 + 0.1046 * 200000 = 31380 + 20920 = 52300
    expect(resultRimaMenor.descuentos_trabajador.afp).toBe(52300)
  })
})

// ============================================================
// Tests auxiliares: calcularIUSC
// ============================================================
describe('calcularIUSC — tabla tramos', () => {
  const tramos = IND.tramos_iusc

  it('exento si RLI ≤ $943.501', () => {
    expect(calcularIUSC(943_501, tramos)).toBe(0)
    expect(calcularIUSC(500_000, tramos)).toBe(0)
    expect(calcularIUSC(0, tramos)).toBe(0)
  })

  it('tramo 2: RLI $1M → IUSC $2.260', () => {
    // 1.000.000 * 0.04 - 37.740 = 2.260
    expect(calcularIUSC(1_000_000, tramos)).toBe(2_260)
  })

  it('tramo 2: RLI $1.5M → IUSC $22.260', () => {
    // 1.500.000 * 0.04 - 37.740 = 22.260
    expect(calcularIUSC(1_500_000, tramos)).toBe(22_260)
  })

  it('tramo 2: RLI $2M → IUSC $42.260', () => {
    expect(calcularIUSC(2_000_000, tramos)).toBe(42_260)
  })

  it('RLI negativo → $0', () => {
    expect(calcularIUSC(-100_000, tramos)).toBe(0)
  })
})

// ============================================================
// Tests auxiliares: resolverBrutoDesdeNeto
// ============================================================
describe('resolverBrutoDesdeNeto — bisección', () => {
  const tasaUno = 0.1046

  it('$500K → bruto $605.767', () => {
    const bruto = resolverBrutoDesdeNeto(500_000, tasaUno, IND.tope_afp)
    expect(bruto).toBe(605_767)
  })

  it('$1M → bruto $1.211.533', () => {
    const bruto = resolverBrutoDesdeNeto(1_000_000, tasaUno, IND.tope_afp)
    expect(bruto).toBe(1_211_533)
  })

  it('$1.5M → bruto $1.817.301', () => {
    const bruto = resolverBrutoDesdeNeto(1_500_000, tasaUno, IND.tope_afp)
    expect(bruto).toBe(1_817_301)
  })
})

// ============================================================
// Reforma Previsional — Gradualidad por fecha (Ley 21.735)
// ============================================================
describe('obtenerTasasReforma — gradualidad por periodo', () => {
  it('2026-03: cap_individual 0,1%, expectativa 0,9%, rentabilidad 0%', () => {
    const tasas = obtenerTasasReforma('2026-03')
    expect(tasas.cap_individual_afp).toBe(0.001)
    expect(tasas.expectativa_vida).toBe(0.009)
    expect(tasas.rentabilidad_protegida).toBe(0)
    expect(tasas.ley_sanna).toBe(0.003)
  })

  it('2026-08: expectativa sube a 1,0%, rentabilidad activa 0,9%', () => {
    const tasas = obtenerTasasReforma('2026-08')
    expect(tasas.cap_individual_afp).toBe(0.001)
    expect(tasas.expectativa_vida).toBe(0.010)
    expect(tasas.rentabilidad_protegida).toBe(0.009)
  })

  it('2027-01: cap_individual sube a 0,3%', () => {
    const tasas = obtenerTasasReforma('2027-01')
    expect(tasas.cap_individual_afp).toBe(0.003)
    expect(tasas.expectativa_vida).toBe(0.010)
    expect(tasas.rentabilidad_protegida).toBe(0.009)
  })

  it('2029-06: cap_individual sube a 0,5%', () => {
    const tasas = obtenerTasasReforma('2029-06')
    expect(tasas.cap_individual_afp).toBe(0.005)
  })

  it('2033-01: cap_individual sube a 4,5%', () => {
    const tasas = obtenerTasasReforma('2033-01')
    expect(tasas.cap_individual_afp).toBe(0.045)
  })

  it('pre-2026: todo en 0 excepto SANNA', () => {
    const tasas = obtenerTasasReforma('2025-12')
    expect(tasas.cap_individual_afp).toBe(0)
    expect(tasas.expectativa_vida).toBe(0)
    expect(tasas.rentabilidad_protegida).toBe(0)
    expect(tasas.ley_sanna).toBe(0.003)
  })
})

// ============================================================
// Reforma en motor: pensionado exento, no-pensionado aplica
// ============================================================
describe('Reforma en motor — cotizaciones empleador', () => {
  it('ley_sanna siempre presente (incluye pensionados)', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      es_pensionado: true,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.cotizaciones_empleador.ley_sanna).toBeGreaterThan(0)
  })

  it('no-pensionado: 4 cotizaciones reforma > 0 (marzo 2026)', () => {
    const resultado = calcularLiquidacion(inputBase(600_000, 'bruto'))
    expect(resultado.cotizaciones_empleador.afp_empleador).toBeGreaterThan(0)
    expect(resultado.cotizaciones_empleador.expectativa_vida).toBeGreaterThan(0)
    // rentabilidad_protegida = 0 en marzo 2026
    expect(resultado.cotizaciones_empleador.rentabilidad_protegida).toBe(0)
    expect(resultado.cotizaciones_empleador.ley_sanna).toBeGreaterThan(0)
  })

  it('post agosto 2026: rentabilidad_protegida > 0', () => {
    const indAgosto = {
      ...IND,
      mes: '2026-08',
    }
    const resultado = calcularLiquidacion(inputBase(600_000, 'bruto'), indAgosto)
    expect(resultado.cotizaciones_empleador.rentabilidad_protegida).toBeGreaterThan(0)
  })
})

// ============================================================
// HU-24: Tests unitarios motor v3.1 — Casos borde
// ============================================================

// ── APV Régimen A: NO reduce RLI ──
describe('APV Régimen A — no afecta IUSC', () => {
  const sinAPV = calcularLiquidacion(inputBase(1_200_000, 'bruto'))
  const conAPV_A: InputLiquidacion = {
    ...inputBase(1_200_000, 'bruto'),
    apv_monto: 50_000,
    apv_regimen: 'A',
  }
  const resultAPV_A = calcularLiquidacion(conAPV_A)

  it('RLI igual con y sin APV Régimen A', () => {
    expect(resultAPV_A.meta.rli_calculado).toBe(sinAPV.meta.rli_calculado)
  })

  it('IUSC igual con y sin APV Régimen A', () => {
    expect(resultAPV_A.descuentos_trabajador.iusc).toBe(sinAPV.descuentos_trabajador.iusc)
  })

  it('APV descuento aplicado', () => {
    expect(resultAPV_A.descuentos_trabajador.apv).toBe(50_000)
  })

  it('Líquido menor por APV descuento', () => {
    expect(resultAPV_A.totales.liquido).toBe(sinAPV.totales.liquido - 50_000)
  })
})

// ── APV Régimen B: SÍ reduce RLI ──
describe('APV Régimen B — reduce RLI y IUSC', () => {
  const sinAPV = calcularLiquidacion(inputBase(1_200_000, 'bruto'))
  const conAPV_B: InputLiquidacion = {
    ...inputBase(1_200_000, 'bruto'),
    apv_monto: 100_000,
    apv_regimen: 'B',
  }
  const resultAPV_B = calcularLiquidacion(conAPV_B)

  it('RLI menor con APV Régimen B', () => {
    expect(resultAPV_B.meta.rli_calculado).toBe(
      sinAPV.meta.rli_calculado - 100_000
    )
  })

  it('IUSC menor o igual con APV Régimen B', () => {
    expect(resultAPV_B.descuentos_trabajador.iusc).toBeLessThanOrEqual(
      sinAPV.descuentos_trabajador.iusc
    )
  })

  it('APV descuento aplicado', () => {
    expect(resultAPV_B.descuentos_trabajador.apv).toBe(100_000)
  })
})

// ── APV Régimen B: tope 50 UF ──
describe('APV Régimen B — tope 50 UF', () => {
  const tope50UF = Math.round(50 * IND.uf) // ~$1.992.086
  const conAPV_exceso: InputLiquidacion = {
    ...inputBase(3_000_000, 'bruto'),
    apv_monto: 2_500_000, // mayor a 50 UF
    apv_regimen: 'B',
  }
  const resultado = calcularLiquidacion(conAPV_exceso)

  it('APV descuento = tope 50 UF, no el monto solicitado', () => {
    expect(resultado.descuentos_trabajador.apv).toBe(tope50UF)
  })
})

// ── Sueldo mínimo TCP (bruto $539.000) ──
describe('Sueldo mínimo TCP — $539.000 bruto', () => {
  const resultado = calcularLiquidacion(inputBase(539_000, 'bruto'))

  it('bruto = $539.000', () => {
    expect(resultado.totales.bruto).toBe(539_000)
  })

  it('exento IUSC (RLI < $943.501)', () => {
    expect(resultado.descuentos_trabajador.iusc).toBe(0)
  })

  it('cesantía trabajador = $0', () => {
    expect(resultado.descuentos_trabajador.cesantia).toBe(0)
  })

  it('líquido positivo', () => {
    expect(resultado.totales.liquido).toBeGreaterThan(0)
  })
})

// ── Bisección con tope AFP ──
describe('Bisección — sueldo alto cerca del tope AFP', () => {
  // Tope AFP 90 UF = $3.585.755
  const resultado = calcularLiquidacion(inputBase(3_000_000))

  it('bruto > $3M (resolución bisección)', () => {
    expect(resultado.totales.bruto).toBeGreaterThan(3_000_000)
  })

  it('AFP no puede exceder tope × tasa', () => {
    const maxAfp = Math.round(IND.tope_afp * 0.1046)
    expect(resultado.descuentos_trabajador.afp).toBeLessThanOrEqual(maxAfp)
  })

  it('bisección converge: bruto - AFP - salud = pactado', () => {
    const { bruto } = resultado.totales
    const { afp, salud } = resultado.descuentos_trabajador
    expect(bruto - afp - salud).toBe(3_000_000)
  })
})

// ── IUSC tramos altos ──
describe('IUSC — tramos 3 a 7', () => {
  const tramos = IND.tramos_iusc

  it('tramo 3: RLI $3M → IUSC $118.393', () => {
    // 3.000.000 * 0.08 - 121.607 = 118.393
    expect(calcularIUSC(3_000_000, tramos)).toBe(118_393)
  })

  it('tramo 4: RLI $4M → IUSC $159.480', () => {
    // 4.000.000 * 0.135 - 380.520 = 159.480
    expect(calcularIUSC(4_000_000, tramos)).toBe(159_480)
  })

  it('tramo 5: RLI $6M → IUSC $273.030', () => {
    // 6.000.000 * 0.23 - 1.106.970 = 273.030
    expect(calcularIUSC(6_000_000, tramos)).toBe(273_030)
  })

  it('tramo 6: RLI $8M → IUSC $662.660', () => {
    // 8.000.000 * 0.304 - 1.769.340 = 662.660
    expect(calcularIUSC(8_000_000, tramos)).toBe(662_660)
  })

  it('tramo 7: RLI $10M → IUSC $1.015.540', () => {
    // 10.000.000 * 0.37 - 2.684.460 = 1.015.540
    expect(calcularIUSC(10_000_000, tramos)).toBe(1_015_540)
  })

  it('tramo 7: RLI $15M → IUSC $2.865.540', () => {
    // 15.000.000 * 0.37 - 2.684.460 = 2.865.540
    expect(calcularIUSC(15_000_000, tramos)).toBe(2_865_540)
  })
})

// ── Horas extra ──
describe('Horas extra — recargo 50%', () => {
  const conHE: InputLiquidacion = {
    ...inputBase(600_000, 'bruto'),
    horas_extra: 10,
  }
  const resultado = calcularLiquidacion(conHE)
  const sinHE = calcularLiquidacion(inputBase(600_000, 'bruto'))

  it('horas extra calculadas correctamente', () => {
    // valorHora = 600000 / 30 / 8 = 2500
    // HE = 10 * 2500 * 1.5 = 37500
    expect(resultado.haberes.horas_extra).toBe(37_500)
  })

  it('bruto mayor con horas extra', () => {
    expect(resultado.totales.bruto).toBe(sinHE.totales.bruto + 37_500)
  })
})

// ── Cargas familiares ──
describe('Asignación familiar — cargas', () => {
  it('1 carga: UF × 0.25', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      cargas_familiares: 1,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.haberes.asignacion_familiar).toBe(Math.round(1 * IND.uf * 0.25))
  })

  it('3 cargas: 3 × UF × 0.20', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      cargas_familiares: 3,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.haberes.asignacion_familiar).toBe(Math.round(3 * IND.uf * 0.20))
  })

  it('5 cargas: 5 × UF × 0.15', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      cargas_familiares: 5,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.haberes.asignacion_familiar).toBe(Math.round(5 * IND.uf * 0.15))
  })

  it('8 cargas: 8 × UF × 0.10', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      cargas_familiares: 8,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.haberes.asignacion_familiar).toBe(Math.round(8 * IND.uf * 0.10))
  })

  it('0 cargas: $0', () => {
    const resultado = calcularLiquidacion(inputBase(600_000, 'bruto'))
    expect(resultado.haberes.asignacion_familiar).toBe(0)
  })
})

// ── Días parciales sin licencia ──
describe('Días parciales (sin licencia) — prorrateo simple', () => {
  const input20dias: InputLiquidacion = {
    ...inputBase(600_000, 'bruto'),
    dias_trabajados: 20,
  }
  const resultado = calcularLiquidacion(input20dias)

  it('sueldo base = bruto × 20/30', () => {
    expect(resultado.haberes.sueldo_base).toBe(Math.round(600_000 * 20 / 30))
  })

  it('bruto = sueldo ajustado', () => {
    expect(resultado.totales.bruto).toBe(Math.round(600_000 * 20 / 30))
  })
})

// ── Validaciones ──
describe('Validaciones del motor', () => {
  it('AFP inexistente → error', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      afp: 'Inexistente',
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.meta.errores).toBeDefined()
    expect(resultado.meta.errores!.some(e => e.includes('AFP'))).toBe(true)
  })

  it('dias_trabajados > 30 → error', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      dias_trabajados: 31,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.meta.errores).toBeDefined()
    expect(resultado.meta.errores!.some(e => e.includes('dias_trabajados'))).toBe(true)
  })

  it('licencia parcial sin RIMA → error', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      dias_trabajados: 20,
      dias_licencia_medica: 10,
      // rima omitido
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.meta.errores).toBeDefined()
    expect(resultado.meta.errores!.some(e => e.includes('RIMA'))).toBe(true)
  })

  it('APV sin régimen → error', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      apv_monto: 50_000,
      // apv_regimen omitido
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.meta.errores).toBeDefined()
    expect(resultado.meta.errores!.some(e => e.includes('apv_regimen'))).toBe(true)
  })

  it('dias_trabajados + dias_licencia > 30 → error', () => {
    const input: InputLiquidacion = {
      ...inputBase(600_000, 'bruto'),
      dias_trabajados: 20,
      dias_licencia_medica: 15,
      rima: 500_000,
    }
    const resultado = calcularLiquidacion(input)
    expect(resultado.meta.errores).toBeDefined()
    expect(resultado.meta.errores!.some(e => e.includes('superar 30'))).toBe(true)
  })
})

// ── Metadatos ──
describe('Metadatos — auditoría', () => {
  const resultado = calcularLiquidacion(inputBase(600_000, 'bruto'))

  it('motor_version = v3.1', () => {
    expect(resultado.meta.motor_version).toBe('v3.1')
  })

  it('periodo = indicadores.mes', () => {
    expect(resultado.meta.periodo).toBe('2026-03')
  })

  it('indicadores_usados contiene UF, UTM, sueldo_minimo', () => {
    expect(resultado.meta.indicadores_usados.uf).toBe(39841.72)
    expect(resultado.meta.indicadores_usados.utm).toBe(69889)
    expect(resultado.meta.indicadores_usados.sueldo_minimo_tcp).toBe(539000)
  })

  it('rli_calculado presente', () => {
    expect(resultado.meta.rli_calculado).toBeGreaterThan(0)
  })

  it('sin errores en input válido', () => {
    expect(resultado.meta.errores).toBeUndefined()
  })
})

// ── Integridad numérica ──
describe('Integridad numérica — haberes - descuentos = líquido', () => {
  const casos = [
    inputBase(500_000),
    inputBase(1_000_000),
    inputBase(2_000_000),
    inputBase(539_000, 'bruto'),
    inputBase(3_000_000, 'bruto'),
  ]

  casos.forEach((input, idx) => {
    it(`caso ${idx + 1}: total_haberes - total_descuentos = liquido`, () => {
      const r = calcularLiquidacion(input)
      expect(r.haberes.total_haberes - r.descuentos_trabajador.total_descuentos).toBe(
        r.totales.liquido
      )
    })
  })
})

// ── Diferentes AFPs ──
describe('Diferentes AFPs — tasas correctas', () => {
  const afps = ['Capital', 'Cuprum', 'Habitat', 'PlanVital', 'Provida', 'Modelo', 'Uno']

  afps.forEach(afp => {
    it(`${afp}: AFP calculada con tasa correcta`, () => {
      const input: InputLiquidacion = {
        sueldo_base: 600_000,
        tipo_sueldo: 'bruto',
        afp,
        es_pensionado: false,
        dias_trabajados: 30,
      }
      const resultado = calcularLiquidacion(input)
      const tasaEsperada = IND.afp_tasas[afp].tasa_obligatoria
      const afpEsperado = Math.round(600_000 * tasaEsperada)
      expect(resultado.descuentos_trabajador.afp).toBe(afpEsperado)
    })
  })
})
