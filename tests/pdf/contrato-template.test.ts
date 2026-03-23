import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderTemplate } from '@/lib/pdf/render-template'

let templateHtml: string

const baseVars = {
  // Empleador
  nombres_empleador: 'María',
  apellidos_empleador: 'González Ruiz',
  rut_empleador: '12.345.678-9',
  direccion_empleador: 'Av. Providencia 1234',
  comuna_empleador: 'Providencia',
  correo_empleador: 'maria@email.com',

  // Trabajador
  nombres_trabajador: 'Rosa',
  apellidos_trabajador: 'Martínez López',
  nacionalidad: 'Chilena',
  nacimiento_trabajador: '15/03/1985',
  direccion_trabajador: 'Calle Los Aromos 567',
  comuna_trabajador: 'Santiago',
  email_trabajador: 'rosa@email.com',

  // Previsión
  afp_trabajador: 'Habitat',
  salud_trabajador: 'Fonasa',

  // Contrato
  sueldo_base: 539000,
  tipo_sueldo: 'imponible',
  fecha_inicio: '01 de abril de 2026',
  tareas_contrato: 'Aseo general, cocina, lavado y planchado de ropa.',
  dia: '22',
  mes: 'marzo',
  ano: '2026',

  // Extras opcionales
  gratificacion: true,
  asignacion_colacion: 30000,
  asignacion_movilizacion: 20000,
}

beforeAll(() => {
  templateHtml = readFileSync(
    join(process.cwd(), 'src/templates/contratos/contrato_tcp.html'),
    'utf-8'
  )
})

describe('contrato_tcp.html — 8 combinaciones', () => {
  // Combinación 1: puertas_adentro + full + rut
  it('PA + Full + RUT', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
    })

    expect(result).toContain('Puertas Adentro')
    expect(result).not.toContain('Puertas Afuera</span>')
    expect(result).toContain('alimentación adecuada y alojamiento')
    expect(result).toContain('12 horas diarias')
    expect(result).toContain('bolsa de 15 horas adicionales')
    expect(result).toContain('Cédula de Identidad')
    expect(result).not.toContain('N° de Pasaporte')
    expect(result).toContain('539.000')
  })

  // Combinación 2: puertas_adentro + full + pasaporte
  it('PA + Full + Pasaporte', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: false,
      doc_pasaporte: true,
      numero_documento: 'AB1234567',
      horas_semanales: 45,
    })

    expect(result).toContain('Puertas Adentro')
    expect(result).toContain('N° de Pasaporte')
    expect(result).toContain('AB1234567')
    expect(result).not.toContain('Cédula de Identidad')
  })

  // Combinación 3: puertas_adentro + part + rut
  it('PA + Part + RUT', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: false,
      jornada_part: true,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 30,
      dias_semana: 5,
    })

    expect(result).toContain('jornada parcial de 30 horas semanales')
    expect(result).not.toContain('bolsa de 15 horas')
    expect(result).toContain('Cédula de Identidad')
  })

  // Combinación 4: puertas_adentro + part + pasaporte
  it('PA + Part + Pasaporte', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: false,
      jornada_part: true,
      doc_rut: false,
      doc_pasaporte: true,
      numero_documento: 'XY9876543',
      horas_semanales: 20,
      dias_semana: 4,
    })

    expect(result).toContain('jornada parcial de 20 horas semanales')
    expect(result).toContain('N° de Pasaporte')
    expect(result).toContain('Pasaporte: XY9876543')
  })

  // Combinación 5: puertas_afuera + full + rut
  it('PF + Full + RUT', () => {
    const horarios = [
      { dia: 'Lunes', entrada: '08:00', salida: '16:00', colacion: '12:00-12:30' },
      { dia: 'Martes', entrada: '08:00', salida: '16:00', colacion: '12:00-12:30' },
      { dia: 'Miércoles', entrada: '08:00', salida: '16:00', colacion: '12:00-12:30' },
      { dia: 'Jueves', entrada: '08:00', salida: '16:00', colacion: '12:00-12:30' },
      { dia: 'Viernes', entrada: '08:00', salida: '16:00', colacion: '12:00-12:30' },
      { dia: 'Sábado', entrada: '08:00', salida: '13:00', colacion: '-' },
    ]

    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: false,
      puertas_afuera: true,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
      horarios,
    })

    expect(result).toContain('Puertas Afuera')
    expect(result).not.toContain('alimentación adecuada y alojamiento')
    expect(result).toContain('jornada ordinaria de 45 horas semanales')
    expect(result).toContain('Lunes')
    expect(result).toContain('08:00')
    expect(result).toContain('Sábado')
    expect(result).toContain('bolsa de 15 horas adicionales')
    expect(result).toContain('Cédula de Identidad')
  })

  // Combinación 6: puertas_afuera + full + pasaporte
  it('PF + Full + Pasaporte', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: false,
      puertas_afuera: true,
      jornada_full: true,
      jornada_part: false,
      doc_rut: false,
      doc_pasaporte: true,
      numero_documento: 'CD5551234',
      horas_semanales: 45,
      horarios: [
        { dia: 'Lunes', entrada: '09:00', salida: '17:00', colacion: '13:00-13:30' },
      ],
    })

    expect(result).toContain('Puertas Afuera')
    expect(result).toContain('N° de Pasaporte')
    expect(result).toContain('CD5551234')
  })

  // Combinación 7: puertas_afuera + part + rut
  it('PF + Part + RUT', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: false,
      puertas_afuera: true,
      jornada_full: false,
      jornada_part: true,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 25,
      dias_semana: 5,
      horarios: [
        { dia: 'Lunes', entrada: '09:00', salida: '14:00', colacion: '-' },
      ],
    })

    expect(result).toContain('jornada parcial de 25 horas semanales')
    expect(result).not.toContain('bolsa de 15 horas')
    expect(result).toContain('09:00')
  })

  // Combinación 8: puertas_afuera + part + pasaporte
  it('PF + Part + Pasaporte', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: false,
      puertas_afuera: true,
      jornada_full: false,
      jornada_part: true,
      doc_rut: false,
      doc_pasaporte: true,
      numero_documento: 'EF7778899',
      horas_semanales: 20,
      dias_semana: 4,
      horarios: [
        { dia: 'Lunes', entrada: '10:00', salida: '15:00', colacion: '-' },
      ],
    })

    expect(result).toContain('Puertas Afuera')
    expect(result).toContain('jornada parcial de 20 horas semanales')
    expect(result).toContain('Pasaporte: EF7778899')
  })
})

describe('contrato_tcp.html — secciones legales', () => {
  it('incluye referencia a Ley 21.735', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
    })

    expect(result).toContain('Ley 21.735')
    expect(result).toContain('Reforma Previsional')
  })

  it('incluye cesantía empleador 3% y exención trabajador', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
    })

    expect(result).toContain('3,00%')
    expect(result).toContain('exento/a del pago de cotización de cesantía')
  })

  it('incluye contrato indefinido cuando no hay fecha_termino', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
      con_termino: false,
    })

    expect(result).toContain('indefinido')
  })

  it('incluye fecha término cuando con_termino es true', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
      con_termino: true,
      fecha_termino: '31 de diciembre de 2026',
    })

    expect(result).toContain('31 de diciembre de 2026')
  })

  it('muestra secciones de firma con datos correctos', () => {
    const result = renderTemplate(templateHtml, {
      ...baseVars,
      puertas_adentro: true,
      puertas_afuera: false,
      jornada_full: true,
      jornada_part: false,
      doc_rut: true,
      doc_pasaporte: false,
      numero_documento: '12.345.678-9',
      horas_semanales: 45,
    })

    expect(result).toContain('María González Ruiz')
    expect(result).toContain('Rosa Martínez López')
    expect(result).toContain('Empleador/a')
    expect(result).toContain('Trabajador/a')
  })
})
