import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/pdf/render-template'
import {
  CONTRATO_CREADO_TEMPLATE,
  LIQUIDACION_GENERADA_TEMPLATE,
  RECORDATORIO_MENSUAL_TEMPLATE,
} from '@/lib/email/templates'

describe('ContratoCreadoTemplate', () => {
  const vars = {
    trabajador_nombre: 'Rosa Martínez',
    empleador_nombre: 'María González',
    link_contrato: 'https://app.gesti.cl/contratos/abc-123?token=xyz',
    fecha_hoy: '22/03/2026',
    url_portal: 'https://app.gesti.cl',
  }

  it('renderiza saludo personalizado', () => {
    const html = renderTemplate(CONTRATO_CREADO_TEMPLATE, vars)
    expect(html).toContain('Hola <strong>Rosa Martínez</strong>')
  })

  it('incluye nombre del empleador', () => {
    const html = renderTemplate(CONTRATO_CREADO_TEMPLATE, vars)
    expect(html).toContain('María González')
  })

  it('incluye link al contrato', () => {
    const html = renderTemplate(CONTRATO_CREADO_TEMPLATE, vars)
    expect(html).toContain('href="https://app.gesti.cl/contratos/abc-123?token=xyz"')
  })

  it('incluye fecha', () => {
    const html = renderTemplate(CONTRATO_CREADO_TEMPLATE, vars)
    expect(html).toContain('22/03/2026')
  })

  it('incluye header con logo y footer con portal', () => {
    const html = renderTemplate(CONTRATO_CREADO_TEMPLATE, vars)
    expect(html).toContain('gesti.cl/lovable-uploads')
    expect(html).toContain('Gesti V3.1')
    expect(html).toContain('ajustar tus preferencias')
  })
})

describe('LiquidacionGeneradaTemplate', () => {
  const vars = {
    trabajador_nombre: 'Rosa Martínez',
    periodo: 'Marzo 2026',
    bruto: 723750,
    descuentos: 99392,
    liquido: 624358,
    link_pdf_liquidacion: 'https://storage.gesti.cl/liquidacion.pdf',
    link_pdf_resumen: 'https://storage.gesti.cl/resumen.pdf',
    url_portal: 'https://app.gesti.cl',
  }

  it('renderiza período en título y cuerpo', () => {
    const html = renderTemplate(LIQUIDACION_GENERADA_TEMPLATE, vars)
    expect(html).toContain('Marzo 2026')
  })

  it('muestra tabla resumen con montos formateados', () => {
    const html = renderTemplate(LIQUIDACION_GENERADA_TEMPLATE, vars)
    expect(html).toContain('723.750')
    expect(html).toContain('99.392')
    expect(html).toContain('624.358')
  })

  it('incluye links a ambos PDFs', () => {
    const html = renderTemplate(LIQUIDACION_GENERADA_TEMPLATE, vars)
    expect(html).toContain('href="https://storage.gesti.cl/liquidacion.pdf"')
    expect(html).toContain('href="https://storage.gesti.cl/resumen.pdf"')
  })

  it('tiene botón de descarga liquidación y resumen', () => {
    const html = renderTemplate(LIQUIDACION_GENERADA_TEMPLATE, vars)
    expect(html).toContain('Descargar Liquidación')
    expect(html).toContain('Descargar Resumen de Pagos')
  })
})

describe('RecordatorioMensualTemplate', () => {
  const vars = {
    usuario_nombre: 'María González',
    mes: 'Marzo',
    contratos: [
      { nombre_trabajador: 'Rosa Martínez' },
      { nombre_trabajador: 'Pedro Soto' },
    ],
    url_nueva_liquidacion: 'https://app.gesti.cl/liquidaciones/nueva',
    url_portal: 'https://app.gesti.cl',
  }

  it('renderiza saludo y mes', () => {
    const html = renderTemplate(RECORDATORIO_MENSUAL_TEMPLATE, vars)
    expect(html).toContain('Hola <strong>María González</strong>')
    expect(html).toContain('Marzo')
  })

  it('lista contratos activos', () => {
    const html = renderTemplate(RECORDATORIO_MENSUAL_TEMPLATE, vars)
    expect(html).toContain('Rosa Martínez')
    expect(html).toContain('Pedro Soto')
  })

  it('incluye link a nueva liquidación', () => {
    const html = renderTemplate(RECORDATORIO_MENSUAL_TEMPLATE, vars)
    expect(html).toContain('href="https://app.gesti.cl/liquidaciones/nueva"')
  })

  it('incluye CTA', () => {
    const html = renderTemplate(RECORDATORIO_MENSUAL_TEMPLATE, vars)
    expect(html).toContain('Ir a Generar Liquidaciones')
  })
})
