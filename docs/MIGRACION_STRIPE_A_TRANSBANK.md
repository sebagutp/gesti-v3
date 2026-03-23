# Migración Stripe → Transbank — Gesti V3.1

> **Fecha:** 2026-03-23
> **Motivo:** Transbank es el procesador de pagos estándar en Chile. Los usuarios TCP pagan con tarjetas chilenas (débito/crédito) vía Webpay.

---

## 1. Diferencias Fundamentales

| Concepto | Stripe | Transbank |
|----------|--------|-----------|
| Suscripciones nativas | ✅ Stripe Billing | ❌ No tiene. Gestión manual. |
| Billing Portal | ✅ Portal auto-servicio | ❌ No existe. UI propia. |
| Webhooks | ✅ Signature verification | ✅ Callback URL + token de retorno |
| Tokenización tarjetas | ✅ Customer + PaymentMethod | ✅ Oneclick Mall (inscripción + cobro) |
| Moneda | Multi-moneda | CLP solamente |
| SDK Node.js | `stripe` | `transbank-sdk` |
| Ambiente test | `sk_test_*` | IntegrationCommerceCodes + IntegrationApiKeys |
| Checkout | Hosted Checkout Page | Redirect a Webpay (formulario Transbank) |

---

## 2. Estrategia de Implementación

### Opción elegida: Webpay Plus + Recurrencia manual

**¿Por qué no Oneclick?**
Oneclick requiere inscripción de tarjeta + cobros automáticos, lo que agrega complejidad y requiere certificación adicional con Transbank. Para el MVP, Webpay Plus con renovación manual es más simple y funcional.

**Flujo de pago:**
1. Usuario selecciona plan Pro (Mensual o Anual)
2. `POST /api/billing/checkout` → crea transacción Webpay Plus
3. Usuario redirigido a formulario Webpay (Transbank)
4. Transbank procesa pago y redirige a `/api/billing/callback`
5. Callback verifica transacción (`commit`) y actualiza `user_billing`
6. Redirige a `/facturacion/success` o `/facturacion?error=...`

**Renovación:**
- Cron de expiración (`/api/cron/expire-plans`) marca planes vencidos
- UI muestra botón "Renovar" cuando el plan está por vencer o expirado
- No hay cobro automático — el usuario paga cada ciclo manualmente

---

## 3. Archivos Afectados

### Eliminar
- `src/lib/stripe/client.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/billing/portal/route.ts`

### Crear
- `src/lib/transbank/client.ts` — Instancia WebpayPlus con environment
- `src/app/api/billing/callback/route.ts` — GET callback de Transbank (commit + redirect)

### Modificar
- `src/app/api/billing/checkout/route.ts` — Reemplazar Stripe por Transbank WebpayPlus.Transaction
- `src/app/api/billing/plan/route.ts` — Eliminar referencia a stripe_subscription_id
- `src/app/(dashboard)/facturacion/page.tsx` — Eliminar botón portal Stripe, actualizar flujo
- `src/app/(dashboard)/facturacion/success/page.tsx` — Verificar con token Transbank
- `src/lib/auth/checkPlanAccess.ts` — Sin cambios (ya consulta user_billing)
- `src/app/api/cron/expire-plans/route.ts` — Sin cambios (ya marca expired)

### DB (migración SQL)
```sql
-- Renombrar columnas en user_billing
ALTER TABLE user_billing RENAME COLUMN stripe_customer_id TO tbk_order_id;
ALTER TABLE user_billing RENAME COLUMN stripe_subscription_id TO tbk_token;
-- tbk_order_id: último order ID de Transbank (buy_order)
-- tbk_token: token de la última transacción exitosa
```

### ENV
```bash
# Eliminar
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO_MENSUAL=
STRIPE_PRICE_PRO_ANUAL=

# Agregar
TBK_COMMERCE_CODE=597055555532          # Código comercio (test)
TBK_API_KEY=579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C  # API Key (test)
TBK_ENVIRONMENT=integration              # integration | production
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Para return/callback URLs
```

### package.json
```bash
# Eliminar
npm uninstall stripe @stripe/stripe-js

# Agregar
npm install transbank-sdk
```

---

## 4. Código de Referencia

### `src/lib/transbank/client.ts`
```typescript
import { WebpayPlus, Environment } from 'transbank-sdk'

const environment = process.env.TBK_ENVIRONMENT === 'production'
  ? Environment.Production
  : Environment.Integration

const commerceCode = process.env.TBK_COMMERCE_CODE!
const apiKey = process.env.TBK_API_KEY!

export const webpayTransaction = new WebpayPlus.Transaction(
  new WebpayPlus.Options(commerceCode, apiKey, environment)
)

export const PLAN_PRICES: Record<string, number> = {
  Pro_Mensual: 9900,
  Pro_Anual: 95040,
}
```

### `POST /api/billing/checkout` (nueva versión)
```typescript
// 1. Autenticar usuario
// 2. Validar plan (Pro_Mensual | Pro_Anual)
// 3. Generar buyOrder único (e.g. `GESTI-{planType}-{timestamp}`)
// 4. Crear transacción:
//    webpayTransaction.create(buyOrder, sessionId, amount, returnUrl)
// 5. Retornar { url, token } para redirect
```

### `GET /api/billing/callback` (nuevo)
```typescript
// 1. Recibir token_ws de query params
// 2. Si token_ws absent → usuario canceló → redirect /facturacion?cancelled=true
// 3. webpayTransaction.commit(token_ws)
// 4. Verificar response_code === 0 (aprobado)
// 5. Upsert user_billing:
//    - plan_type, plan_status='active'
//    - tbk_order_id = buyOrder
//    - tbk_token = token_ws
//    - start_date = now
//    - end_date = now + 30 días (mensual) o + 365 días (anual)
// 6. Redirect → /facturacion/success
```

---

## 5. Impacto en HUs Existentes

### Sprint 1 (ya completado)
- **HU-104 (Billing Shell):** La UI ya existe. Se modifica en Sprint 2 para eliminar referencia a Stripe portal.

### Sprint 2 (pendiente)
- Las HUs de billing (HU-13 a HU-18 en los prompts) deben ser reescritas para Transbank.

### Sprint 3
- **HU-310 (Integración Stripe):** Se reemplaza completamente por HU-310-TBK (Integración Transbank).
- **HU-313 (Webhook Stripe):** Se elimina. No hay webhook — el callback es síncrono.
- **HU-311 (checkPlanAccess real):** Sin cambios, ya consulta user_billing.
- **HU-312 (UI billing mejorada):** Se actualiza para Transbank (sin portal, con botón renovar).

---

## 6. Tabla de Mapeo Stripe → Transbank

| Stripe | Transbank |
|--------|-----------|
| `stripe.checkout.sessions.create()` | `webpayTransaction.create()` |
| `stripe.webhooks.constructEvent()` | `webpayTransaction.commit(token_ws)` |
| `stripe.billingPortal.sessions.create()` | ❌ No existe — UI propia |
| `stripe.subscriptions.retrieve()` | ❌ No existe — calcular fechas manualmente |
| `checkout.session.completed` event | Callback GET con `token_ws` |
| `customer.subscription.updated` event | ❌ No existe — cron expire-plans |
| `customer.subscription.deleted` event | ❌ No existe — cron expire-plans |
| `stripe_customer_id` | `tbk_order_id` (buy_order) |
| `stripe_subscription_id` | `tbk_token` (token transacción) |

---

## 7. Testing

### Ambiente de integración Transbank
- Commerce Code: `597055555532` (Webpay Plus)
- Tarjeta de prueba: `4051 8856 0044 6623`
- CVV: `123` | Exp: cualquier fecha futura
- RUT prueba: `11.111.111-1`
- Password: `123`
- Resultado: Aprobado

### Tarjeta para rechazo
- Tarjeta: `5186 0595 5959 0568`
- Resultado: Rechazado

---

## 8. Certificación Producción

Para pasar a producción con Transbank:
1. Solicitar credenciales de producción en https://www.transbankdevelopers.cl
2. Pasar proceso de certificación (validación técnica)
3. Recibir `commerce_code` y `api_key` de producción
4. Cambiar `TBK_ENVIRONMENT=production` en `.env`
