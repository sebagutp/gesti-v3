import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderTemplate } from '@/lib/pdf/render-template'

let templateHtml: string

const baseVars = {
  periodo: '2026-03',
  trabajador_nombre: 'Rosa Martínez López',
  razon_social: 'María González Ruiz',
  rut_trabajador: '12.345.678-9',
  motor_version: 'v3.1',

  // Haberes
  sueldo_base: 539000,
  gratificacion: 134750,
  colacion: 30000,
  movilizacion: 20000,
  horas_extra: 0,
  asignacion_familiar: 0,
  otros_bonos: 0,
  total_haberes: 723750,

  // Descuentos
  afp: 61662,
  afp_nombre: 'Habitat',
  salud: 37730,
  salud_nombre: 'Fonasa',
  iusc: 0,
  apv: 0,
  anticipo: 0,
  total_descuentos: 99392,

  // Resultado
  bruto: 723750,
  liquido: 624358,
  total_empleador: 790000,

  // Cotizaciones empleador
  cotizaciones: [
    { nombre: 'SIS', tasa: 1.54, monto: 8301 },
    { nombre: 'ISL (Accidentes)', tasa: 0.93, monto: 5013 },
    { nombre: 'Indemnización (Art. 163)', tasa: 4.11, monto: 22153 },
    { nombre: 'Seguro Cesantía', tasa: 3.0, monto: 16170 },
    { nombre: 'Cap. Individual (Ley 21.735)', tasa: 0.1, monto: 539 },
    { nombre: 'Expectativa de Vida (Ley 21.735)', tasa: 0.9, monto: 4851 },
  ],
}

beforeAll(() => {
  templateHtml = readFileSync(
    join(process.cwd(), 'src/templates/liquidaciones/liquidacion_sueldo.html'),
    'utf-8'
  )
})

describe('liquidacion_sueldo.html', () => {
  it('renderiza header con periodo', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('2026-03')
    expect(result).toContain('Liquidación de Sueldo')
  })

  it('muestra datos trabajador y empleador', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Rosa Martínez López')
    expect(result).toContain('María González Ruiz')
    expect(result).toContain('12.345.678-9')
  })

  it('renderiza haberes con montos formateados', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Sueldo base')
    expect(result).toContain('539.000')
    expect(result).toContain('Gratificación legal')
    expect(result).toContain('134.750')
    expect(result).toContain('colación')
    expect(result).toContain('30.000')
    expect(result).toContain('723.750') // total haberes
  })

  it('oculta haberes con valor 0', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).not.toContain('Horas extra')
    expect(result).not.toContain('Asignación familiar')
    expect(result).not.toContain('Otros bonos')
  })

  it('renderiza descuentos', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('AFP (Habitat)')
    expect(result).toContain('61.662')
    expect(result).toContain('Salud (Fonasa)')
    expect(result).toContain('37.730')
    expect(result).toContain('99.392') // total descuentos
  })

  it('oculta IUSC cuando es 0 (exento)', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).not.toContain('Impuesto Único')
  })

  it('muestra IUSC cuando tiene valor', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      iusc: 15420,
      total_descuentos: 114812,
    })
    expect(result).toContain('Impuesto Único (IUSC)')
    expect(result).toContain('15.420')
  })

  it('muestra APV cuando tiene valor', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      apv: 100000,
      apv_regimen: 'B',
      total_descuentos: 199392,
    })
    expect(result).toContain('APV (Régimen B)')
    expect(result).toContain('100.000')
  })

  it('renderiza resumen bruto/descuentos/líquido', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Total Haberes')
    expect(result).toContain('Total Descuentos')
    expect(result).toContain('Sueldo Líquido')
    expect(result).toContain('624.358')
  })

  it('renderiza tabla de cotizaciones empleador', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('SIS')
    expect(result).toContain('1,54')
    expect(result).toContain('8.301')
    expect(result).toContain('Seguro Cesantía')
    expect(result).toContain('Cap. Individual (Ley 21.735)')
    expect(result).toContain('Expectativa de Vida (Ley 21.735)')
  })

  it('muestra costo total empleador', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Costo Total Empleador')
    expect(result).toContain('790.000')
  })

  it('incluye referencia a Ley 21.735 y motor_version', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Ley 21.735')
    expect(result).toContain('v3.1')
  })

  it('oculta RUT si no se provee', () => {
    const vars = { ...baseVars, rut_trabajador: '' }
    const result = renderTemplate(templateHtml, vars)
    expect(result).not.toContain('12.345.678-9')
  })
})
