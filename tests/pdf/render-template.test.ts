import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/pdf/render-template'

describe('renderTemplate', () => {
  describe('sustitución de variables', () => {
    it('reemplaza variables simples', () => {
      const html = '<h1>{{nombre}}</h1>'
      const result = renderTemplate(html, { nombre: 'Juan Pérez' })
      expect(result).toBe('<h1>Juan Pérez</h1>')
    })

    it('formatea números al estilo chileno', () => {
      const html = '<p>${{sueldo}}</p>'
      const result = renderTemplate(html, { sueldo: 1234567 })
      expect(result).toBe('<p>$1.234.567</p>')
    })

    it('formatea números con decimales', () => {
      const html = '<p>{{uf}}</p>'
      const result = renderTemplate(html, { uf: 39841.72 })
      expect(result).toBe('<p>39.841,72</p>')
    })

    it('reemplaza booleano true con "Sí"', () => {
      const html = '<p>{{activo}}</p>'
      const result = renderTemplate(html, { activo: true })
      expect(result).toBe('<p>Sí</p>')
    })

    it('reemplaza booleano false con "No"', () => {
      const html = '<p>{{activo}}</p>'
      const result = renderTemplate(html, { activo: false })
      expect(result).toBe('<p>No</p>')
    })

    it('reemplaza variable inexistente con vacío', () => {
      const html = '<p>{{noexiste}}</p>'
      const result = renderTemplate(html, {})
      expect(result).toBe('<p></p>')
    })

    it('reemplaza múltiples variables', () => {
      const html = '{{nombre}} gana ${{sueldo}}'
      const result = renderTemplate(html, { nombre: 'Ana', sueldo: 539000 })
      expect(result).toBe('Ana gana $539.000')
    })
  })

  describe('condicionales {{#if}}', () => {
    it('muestra bloque cuando variable es truthy', () => {
      const html = '{{#if puertas_adentro}}<p>Puertas adentro</p>{{/if}}'
      const result = renderTemplate(html, { puertas_adentro: true })
      expect(result).toBe('<p>Puertas adentro</p>')
    })

    it('oculta bloque cuando variable es falsy', () => {
      const html = '{{#if puertas_adentro}}<p>Puertas adentro</p>{{/if}}'
      const result = renderTemplate(html, { puertas_adentro: false })
      expect(result).toBe('')
    })

    it('oculta bloque cuando variable no existe', () => {
      const html = '{{#if puertas_adentro}}<p>Puertas adentro</p>{{/if}}'
      const result = renderTemplate(html, {})
      expect(result).toBe('')
    })

    it('soporta if/else', () => {
      const html = '{{#if jornada_full}}<p>45 hrs</p>{{else}}<p>{{horas_semanales}} hrs</p>{{/if}}'
      const result = renderTemplate(html, { jornada_full: false, horas_semanales: 30 })
      expect(result).toBe('<p>30 hrs</p>')
    })

    it('soporta if/else rama verdadera', () => {
      const html = '{{#if jornada_full}}<p>45 hrs</p>{{else}}<p>parcial</p>{{/if}}'
      const result = renderTemplate(html, { jornada_full: true })
      expect(result).toBe('<p>45 hrs</p>')
    })

    it('soporta condicionales anidados', () => {
      const html = '{{#if puertas_adentro}}{{#if jornada_full}}<p>PA+Full</p>{{/if}}{{/if}}'
      const result = renderTemplate(html, { puertas_adentro: true, jornada_full: true })
      expect(result).toBe('<p>PA+Full</p>')
    })

    it('evalúa 0 como falsy', () => {
      const html = '{{#if anticipo}}<p>Tiene anticipo</p>{{/if}}'
      const result = renderTemplate(html, { anticipo: 0 })
      expect(result).toBe('')
    })

    it('evalúa string vacío como falsy', () => {
      const html = '{{#if nota}}<p>{{nota}}</p>{{/if}}'
      const result = renderTemplate(html, { nota: '' })
      expect(result).toBe('')
    })
  })

  describe('iteración {{#each}}', () => {
    it('itera sobre array de objetos', () => {
      const html = '<ul>{{#each items}}<li>{{nombre}}: ${{monto}}</li>{{/each}}</ul>'
      const result = renderTemplate(html, {
        items: [
          { nombre: 'AFP', monto: 50000 },
          { nombre: 'Salud', monto: 35000 },
        ],
      })
      expect(result).toBe('<ul><li>AFP: $50.000</li><li>Salud: $35.000</li></ul>')
    })

    it('retorna vacío para array vacío', () => {
      const html = '<ul>{{#each items}}<li>{{nombre}}</li>{{/each}}</ul>'
      const result = renderTemplate(html, { items: [] })
      expect(result).toBe('<ul></ul>')
    })

    it('retorna vacío si variable no es array', () => {
      const html = '{{#each items}}<li>{{nombre}}</li>{{/each}}'
      const result = renderTemplate(html, { items: 'no es array' })
      expect(result).toBe('')
    })

    it('expone @index dentro del each', () => {
      const html = '{{#each items}}<p>{{@index}}-{{nombre}}</p>{{/each}}'
      const result = renderTemplate(html, {
        items: [{ nombre: 'A' }, { nombre: 'B' }],
      })
      expect(result).toBe('<p>0-A</p><p>1-B</p>')
    })

    it('soporta condicionales dentro de each', () => {
      const html = '{{#each cotizaciones}}{{#if tasa}}<p>{{nombre}}: {{tasa}}%</p>{{/if}}{{/each}}'
      const result = renderTemplate(html, {
        cotizaciones: [
          { nombre: 'AFP', tasa: 11.44 },
          { nombre: 'Rentabilidad', tasa: 0 },
        ],
      })
      expect(result).toBe('<p>AFP: 11,44%</p>')
    })
  })

  describe('caso integración: contrato TCP', () => {
    it('renderiza template combinado correctamente', () => {
      const html = `
<h1>Contrato {{empleador_nombre}}</h1>
{{#if puertas_adentro}}<p>Puertas adentro</p>{{/if}}
{{#if puertas_afuera}}<p>Puertas afuera</p>{{/if}}
{{#if jornada_full}}<p>Jornada completa: 45 hrs</p>{{else}}<p>Jornada parcial: {{horas_semanales}} hrs</p>{{/if}}
{{#if doc_rut}}<p>RUT: {{numero_documento}}</p>{{/if}}
{{#if doc_pasaporte}}<p>Pasaporte: {{numero_documento}}</p>{{/if}}
<p>Sueldo: \${{sueldo_base}}</p>`.trim()

      const result = renderTemplate(html, {
        empleador_nombre: 'María González',
        puertas_adentro: false,
        puertas_afuera: true,
        jornada_full: false,
        horas_semanales: 30,
        doc_rut: true,
        doc_pasaporte: false,
        numero_documento: '12.345.678-9',
        sueldo_base: 539000,
      })

      expect(result).toContain('Contrato María González')
      expect(result).not.toContain('Puertas adentro')
      expect(result).toContain('Puertas afuera')
      expect(result).toContain('Jornada parcial: 30 hrs')
      expect(result).toContain('RUT: 12.345.678-9')
      expect(result).not.toContain('Pasaporte')
      expect(result).toContain('$539.000')
    })
  })
})
