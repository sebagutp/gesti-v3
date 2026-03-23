// ============================================================
// Tests Motor Liquidación v3.1 — HU-111 (7 casos obligatorios)
// AFP Uno, Marzo 2026
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calcularLiquidacion,
  calcularIUSC,
  resolverBrutoDesdeNeto,
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
