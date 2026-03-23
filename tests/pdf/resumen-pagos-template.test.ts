import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderTemplate } from '@/lib/pdf/render-template'

let templateHtml: string

const baseVars = {
  periodo: '2026-03',
  razon_social: 'María González Ruiz',
  trabajador_nombre: 'Rosa Martínez López',
  bruto: 723750,
  liquido: 624358,

  cotizaciones_obligatorias: [
    { nombre: 'SIS', tasa: 1.54, base: 539000, monto: 8301 },
    { nombre: 'ISL (Accidentes del Trabajo)', tasa: 0.93, base: 539000, monto: 5013 },
    { nombre: 'Indemnización a Todo Evento (Art. 163)', tasa: 4.11, base: 539000, monto: 22153 },
    { nombre: 'Seguro de Cesantía', tasa: 3.0, base: 539000, monto: 16170 },
  ],
  subtotal_obligatorias: 51637,

  cotizaciones_reforma: [
    { nombre: 'Capitalización Individual', tasa: 0.1, base: 539000, monto: 539 },
    { nombre: 'Expectativa de Vida', tasa: 0.9, base: 539000, monto: 4851 },
    { nombre: 'Rentabilidad Protegida', tasa: 0, base: 539000, monto: 0 },
  ],
  subtotal_reforma: 5390,

  total_cotizaciones: 57027,
  total_empleador: 780777,
}

beforeAll(() => {
  templateHtml = readFileSync(
    join(process.cwd(), 'src/templates/liquidaciones/resumen_pagos.html'),
    'utf-8'
  )
})

describe('resumen_pagos.html', () => {
  it('renderiza header con período y título', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Resumen de Pagos del Empleador')
    expect(result).toContain('2026-03')
  })

  it('muestra info empleador, trabajador y bruto', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('María González Ruiz')
    expect(result).toContain('Rosa Martínez López')
    expect(result).toContain('723.750')
  })

  it('renderiza cotizaciones obligatorias con base imponible', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('SIS')
    expect(result).toContain('1,54')
    expect(result).toContain('8.301')
    expect(result).toContain('ISL (Accidentes del Trabajo)')
    expect(result).toContain('Indemnización a Todo Evento')
    expect(result).toContain('22.153')
    expect(result).toContain('Seguro de Cesantía')
    expect(result).toContain('16.170')
    expect(result).toContain('51.637') // subtotal
  })

  it('renderiza cotizaciones reforma Ley 21.735', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('LEY 21.735')
    expect(result).toContain('Capitalización Individual')
    expect(result).toContain('539')
    expect(result).toContain('Expectativa de Vida')
    expect(result).toContain('4.851')
    expect(result).toContain('Rentabilidad Protegida')
    expect(result).toContain('5.390') // subtotal reforma
  })

  it('muestra resumen visual: líquido, cotizaciones, total', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Sueldo Líquido')
    expect(result).toContain('624.358')
    expect(result).toContain('Total Cotizaciones Empleador')
    expect(result).toContain('57.027')
    expect(result).toContain('Costo Total Empleador')
    expect(result).toContain('780.777')
  })

  it('muestra detalle de desembolso mensual', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Detalle del Desembolso Mensual')
    expect(result).toContain('Sueldo líquido al trabajador')
    expect(result).toContain('Cotizaciones obligatorias')
    expect(result).toContain('Cotizaciones reforma previsional')
    expect(result).toContain('Total a desembolsar')
  })

  it('incluye referencia a Ley 21.735 en footer', () => {
    const result = renderTemplate(templateHtml, baseVars)
    expect(result).toContain('Ley 21.735')
    expect(result).toContain('gradualidad vigente')
  })
})
