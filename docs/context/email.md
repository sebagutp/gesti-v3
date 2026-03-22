# Email — Gesti V3.1

## Provider
**Resend** — Transaccional email service (API key en `.env.local`).

---

## Funciones Principales

### `enviarEmailContrato(contrato: Contrato, pdfUrl: string)`
Se envía cuando se genera PDF del contrato.

**Destinatario:** `contrato.email_trabajador` + `contrato.email_empleador`

**Template:** `ContratoCreadoTemplate`
- Saludo personalizado
- Link al contrato (con token para acceso sin login)
- PDF adjunto o inline
- Link a portal para firmar (si está habilitado)

**Trigger:** POST `/api/contratos/[id]/generar-pdf` exitoso

---

### `enviarEmailLiquidacion(liquidacion: Liquidacion, pdfLiqUrl: string, pdfResumenUrl: string)`
Se envía cuando se genera PDF de liquidación mensual.

**Destinatario:** `contrato.email_trabajador` + `contrato.email_empleador`

**Adjuntos:**
1. PDF liquidación detallada (con breakdown de haberes/descuentos)
2. PDF resumen de pagos

**Template:** `LiquidacionGeneradaTemplate`
- Saludo
- Período de liquidación (ej. "Marzo 2026")
- Resumen: bruto, descuentos, líquido
- Links a PDFs
- Link a portal

**Trigger:** POST `/api/liquidaciones/[id]/generar-pdf` exitoso

---

### `enviarRecordatorioMensual(userId: string, contratos: Contrato[])`
Cron que corre el día 25 de cada mes, recordando generar liquidaciones.

**Destinatario:** Email del usuario

**Template:** `RecordatorioMensualTemplate`
- Saludo
- Lista de contratos activos
- Link directo a "Nueva liquidación"
- Teléfono soporte

**Trigger:** Cron job (mensual, día 25)

---

## Estructura de Templates (Resend)

Todos los templates usan HTML con variables `{{ }}` que se reemplazan en la función de envío.

### Variables Globales (todas)
- `{{ usuario_nombre }}`
- `{{ fecha_hoy }}` (formato DD/MM/YYYY)
- `{{ url_portal }}` (base del sitio)
- `{{ empresa_nombre }}`

### Template: ContratoCreadoTemplate
```handlebars
<h2>Contrato creado exitosamente</h2>
<p>Hola {{ trabajador_nombre }},</p>
<p>Se ha generado tu contrato con {{ empleador_nombre }}.</p>

<a href="{{ link_contrato }}">Ver Contrato</a>

<p>Para aceptar el contrato, ingresa a tu portal con tu email.</p>
```

### Template: LiquidacionGeneradaTemplate
```handlebars
<h2>Liquidación {{ periodo }}</h2>
<p>Hola {{ trabajador_nombre }},</p>

<table>
  <tr><td>Período:</td><td>{{ periodo }}</td></tr>
  <tr><td>Bruto:</td><td>${{ bruto }}</td></tr>
  <tr><td>Descuentos:</td><td>${{ descuentos }}</td></tr>
  <tr><td><strong>Líquido:</strong></td><td><strong>${{ liquido }}</strong></td></tr>
</table>

<a href="{{ link_pdf_liquidacion }}">Descargar Liquidación Completa</a>
<a href="{{ link_pdf_resumen }}">Descargar Resumen</a>
```

### Template: RecordatorioMensualTemplate
```handlebars
<h2>Recordatorio: Generar Liquidación {{ mes }}</h2>
<p>Hola {{ usuario_nombre }},</p>

<p>Es momento de generar las liquidaciones del mes {{ mes }}.</p>

<p>Contratos pendientes:</p>
<ul>
  {{#each contratos}}
  <li>{{ this.nombre_trabajador }} ({{ this.razon_social }})</li>
  {{/each}}
</ul>

<a href="{{ url_nueva_liquidacion }}">Ir a Generar Liquidación</a>
```

---

## Configuración Resend

### En `lib/email/resend.ts`

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function enviarEmailContrato(contrato: Contrato, pdfUrl: string) {
  const html = renderTemplate(CONTRATO_TEMPLATE, {
    trabajador_nombre: contrato.nombre_trabajador,
    empleador_nombre: contrato.razon_social,
    link_contrato: `${process.env.NEXT_PUBLIC_URL}/contratos/${contrato.id}?token=${contrato.token}`,
  })

  return resend.emails.send({
    from: 'noreply@gesti.cl',
    to: [contrato.email_trabajador, contrato.email_empleador],
    subject: `Contrato creado: ${contrato.razon_social}`,
    html,
    attachments: [
      {
        filename: `Contrato_${contrato.id}.pdf`,
        content: await fetch(pdfUrl).then(r => r.arrayBuffer()),
      }
    ]
  })
}
```

---

## Webhooks (Resend)

Resend envía eventos de entrega/bounce a `POST /api/webhooks/email`:
- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.complained`

Se guardan en tabla `notificaciones` para auditoría.

---

## Características de Seguridad

1. **Sin contraseñas en email:** No enviar credenciales
2. **Tokens de un uso:** Links con token temporal
3. **Rate limit:** Máx 10 emails/usuario/hora
4. **Desuscripción:** Footer con link unsubscribe
5. **SPF/DKIM:** Configurados en dominio gesti.cl
