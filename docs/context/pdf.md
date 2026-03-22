# PDF Generation — Gesti V3.1

## Stack
- **puppeteer-core** + **@sparticuz/chromium** — Headless Chrome sin instalación pesada
- **API Routes solo** — Nunca en Edge Functions (chromium no soportado)
- Node.js 18+

## Restricciones Críticas

### ❌ NO Permitido
- html-pdf-node
- @react-pdf/renderer
- puppeteer completo
- librería pdfkit o similar

### ✅ Permitido
- puppeteer-core + @sparticuz/chromium
- Templates HTML puros
- Supabase Storage para hosting

---

## Pipeline

### 1. `renderTemplate(html: string, variables: Record<string, any>): string`
Reemplaza variables y procesa condicionales Handlebars.

```typescript
// Entrada
const html = `
  <h1>Contrato {{empleador_nombre}}</h1>
  {{#if tipo_contrato_puertas_adentro}}
    <p>Trabajador de casa particular - puertas adentro</p>
  {{/if}}
`

// Salida
const rendered = renderTemplate(html, {
  empleador_nombre: 'Juan Pérez',
  tipo_contrato_puertas_adentro: true
})
```

### 2. `generatePDF(html: string): Promise<Buffer>`
Lanza navegador Chromium, renderiza HTML, captura PDF.

```typescript
const buffer = await generatePDF(htmlRendered)
// buffer es Buffer PDF en memoria
```

**Importante:** timeout 30s, `headless: true`, viewport 1200×1400

### 3. `uploadToSupabase(buffer: Buffer, fileName: string): Promise<string>`
Sube a bucket `documentos`, retorna URL pública.

```typescript
const url = await uploadToSupabase(buffer, `contratos/ABC-123.pdf`)
// url = https://sdobbpbagffmntjfcmuw.supabase.co/storage/v1/object/public/documentos/contratos/ABC-123.pdf
```

---

## Templates HTML

### Ubicación
- Contratos: `src/templates/contratos/contrato_tcp.html`
- Liquidaciones: `src/templates/liquidaciones/liquidacion_sueldo.html`
- Resumen: `src/templates/liquidaciones/resumen_pagos.html`

### Plantilla Unificada: contrato_tcp.html

1 archivo que genera 8 combinaciones usando `{{#if}}`:

```
tipoContrato (puertas_afuera | puertas_adentro)
×
tipoJornada (full | part)
×
tipoDocumento (rut | pasaporte)
= 8 variantes
```

**Condicionales:**
```handlebars
{{#if puertas_adentro}}
  <p>El trabajador prestará servicios dentro del domicilio del empleador...</p>
{{/if}}

{{#if jornada_full}}
  <p>Jornada de 45 horas semanales...</p>
{{else}}
  <p>Jornada de {{horas_semanales}} horas semanales...</p>
{{/if}}
```

### Estructura General

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Poppins', sans-serif; }
    .header { background: #135e5f; color: white; padding: 20px; }
    .content { padding: 20px; }
    .footer { text-align: center; color: #999; margin-top: 40px; }
  </style>
</head>
<body>
  <header class="header">
    <img src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png" height="50">
    <h1>Contrato de Trabajo TCP</h1>
  </header>

  <div class="content">
    <!-- Condicionales y variables -->
  </div>

  <footer class="footer">
    <p>Generado por Gesti V3.1</p>
  </footer>
</body>
</html>
```

### Variables Disponibles (Contrato)

```typescript
{
  // Empleador
  empleador_nombre: string
  rut_empresa: string
  razon_social: string
  email_empleador: string
  domicilio_empleador: string

  // Trabajador
  trabajador_nombre: string
  trabajador_apellidos: string
  tipo_documento: 'rut' | 'pasaporte'
  numero_documento: string
  email_trabajador: string
  domicilio_trabajador: string
  nacionalidad: string

  // Contrato
  tipo_contrato: 'puertas_afuera' | 'puertas_adentro'
  tipo_jornada: 'full' | 'part'
  sueldo_base: number
  tipo_sueldo: string
  afp: string
  fecha_inicio: string
  fecha_termino?: string
  horas_semanales: number

  // Booleanos para {{#if}}
  puertas_adentro: boolean
  puertas_afuera: boolean
  jornada_full: boolean
  jornada_part: boolean
  doc_rut: boolean
  doc_pasaporte: boolean
  con_termino: boolean
}
```

### Variables Disponibles (Liquidación)

```typescript
{
  // Período
  periodo: "2026-03"
  trabajador_nombre: string
  razon_social: string

  // Haberes
  sueldo_base: number
  gratificacion: number
  colacion: number
  movilizacion: number
  horas_extra: number
  asignacion_familiar: number
  otros_bonos: number
  total_haberes: number

  // Descuentos
  afp: number
  salud: number
  iusc: number
  anticipo: number
  apv: number
  total_descuentos: number

  // Resultado
  bruto: number
  liquido: number
  total_empleador: number

  // Cotizaciones (table)
  cotizaciones: Array<{
    nombre: string
    tasa: number
    monto: number
  }>
}
```

---

## Identidad Visual en PDFs

- **Logo:** https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png (PNG 200×50px)
- **Colores:**
  - Headers: Teal `#135e5f`
  - Botones/CTA: Verde `#6fc8a0`
  - Highlights: Amarillo `#ffde59`
  - Texto: Dark `#2f2e40`
  - Fondo: Blanco o `#f4f4f9`
- **Tipografía:** Poppins (Google Fonts)
  - Títulos: weight 600-700
  - Cuerpo: weight 400
  - Labels: weight 500

---

## Implementación en API Routes

### Ejemplo: POST /api/contratos/[id]/generar-pdf

```typescript
// api/contratos/[id]/generar-pdf.ts
import { renderTemplate } from '@/lib/pdf/render'
import { generatePDF } from '@/lib/pdf/generator'
import { uploadToSupabase } from '@/lib/pdf/upload'
import { getContrato } from '@/lib/db/contratos'
import { enviarEmailContrato } from '@/lib/email/resend'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const contrato = await getContrato(params.id)
    const template = await fetch('src/templates/contratos/contrato_tcp.html').then(r => r.text())

    const html = renderTemplate(template, {
      empleador_nombre: contrato.razon_social,
      trabajador_nombre: contrato.nombre_trabajador,
      puertas_adentro: contrato.tipo_contrato === 'puertas_adentro',
      // ... más variables
    })

    const pdfBuffer = await generatePDF(html)
    const pdfUrl = await uploadToSupabase(pdfBuffer, `contratos/${contrato.id}.pdf`)

    // Actualizar contrato
    await updateContrato(contrato.id, {
      pdf_url: pdfUrl,
      estado: 'generado'
    })

    // Enviar email
    await enviarEmailContrato(contrato, pdfUrl)

    return Response.json({ pdf_url: pdfUrl, estado: 'enviado' })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

---

## Performance

- **Timeout:** 30 segundos por PDF
- **Memoria:** ~100MB por proceso Chromium
- **Concurrencia:** Máx 3 PDF simultáneos (configurar en Vercel)
- **Cacheo:** URLs de Storage son públicas y durables
