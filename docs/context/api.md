# context/api.md — Contratos de API (actualizado Sprint 4)

## Endpoints Públicos

### POST /api/calcular-liquidacion
```typescript
// Request
interface CalcRequest {
  sueldo_pactado: number;
  tipo_sueldo: 'liquido' | 'imponible';
  afp: string; // "Capital" | "Cuprum" | "Habitat" | "PlanVital" | "Provida" | "Modelo" | "Uno"
  horas_semanales: number;
  colacion?: number;
  movilizacion?: number;
  otros_bonos?: number;
  cargas_familiares?: number;
  email?: string; // para guardar simulación
}
// Response: ResultadoLiquidacion (ver types.md)
```

### POST /api/generar-pdf
```typescript
// Genera PDF público (simulador)
// Request: { html: string }
// Response: Buffer PDF
```

### Auth (delegado a Supabase Auth)
- **POST /api/auth/register** — `{ email, password, options: { data: { name, last_name } } }`
- **POST /api/auth/login** — `{ email, password }`

## Endpoints Privados (requieren JWT via Supabase Auth session)

### Contratos

#### GET /api/contratos
```typescript
// Response: Contrato[] (filtrado por user_id via RLS)
```

#### POST /api/contratos
```typescript
// Request: Omit<Contrato, 'id' | 'user_id' | 'created_at' | 'token' | 'estado' | 'pdf_url'>
// Response: Contrato (con id, token generados)
```

#### GET /api/contratos/[id]
```typescript
// Response: Contrato (detalle individual)
```

#### POST /api/contratos/[id]/generar-pdf
```typescript
// No body. Genera PDF del contrato, sube a Storage, envía email, actualiza estado.
// Response: { pdf_url: string; estado: 'enviado' }
```

#### GET /api/contratos/[id]/cartola-anual
```typescript
// Genera cartola anual de pagos para un contrato
// Query: ?year=2026
// Response: { contrato, liquidaciones, totales }
```

### Liquidaciones

#### GET /api/liquidaciones?contrato_id=UUID
```typescript
// Response: Liquidacion[]
```

#### POST /api/liquidaciones
```typescript
// Request: { contrato_id, periodo, dias_licencia_medica?, horas_extra?, anticipo?, otros_bonos? }
// Response: Liquidacion (con calculo JSONB completo)
```

#### GET /api/liquidaciones/[id]
```typescript
// Response: Liquidacion (detalle individual)
```

#### POST /api/liquidaciones/[id]/generar-pdf
```typescript
// Genera PDF liquidación + PDF resumen pagos. Sube a Storage.
// Response: { pdf_liquidacion_url, pdf_resumen_pagos_url }
```

#### POST /api/liquidaciones/[id]/enviar
```typescript
// Envía email con links a PDFs. Actualiza estado = "enviada".
// Response: { enviado: true }
```

### Permisos

#### GET/POST /api/permisos
```typescript
// GET: Permisos[] filtrado por contrato_id
// POST: { contrato_id, tipo, fecha_inicio, fecha_fin, observaciones? }
```

### Indicadores

#### GET /api/indicadores?mes=2026-03
```typescript
// Response: IndicadoresPrevisionales
```

### Notificaciones

#### GET /api/notificaciones
```typescript
// Response: Notificacion[] (filtrado por user_id, ordenado por created_at desc)
```

#### POST /api/notificaciones/[id]/read
```typescript
// Marca notificación como leída
// Response: { success: true }
```

### Billing (Transbank Webpay Plus)

#### GET /api/billing/plan
```typescript
// Response: { plan_type, plan_status, start_date, end_date, has_active_plan, days_remaining }
```

#### POST /api/billing/checkout
```typescript
// Request: { plan: 'Pro_Mensual' | 'Pro_Anual' }
// Crea transacción Webpay Plus, retorna URL de redirect
// Response: { success: true, data: { url: string, token: string } }
```

#### GET /api/billing/callback
```typescript
// Callback de Transbank tras pago. Recibe token_ws en query params.
// Ejecuta commit(), actualiza user_billing y billing_transactions.
// Redirect a /facturacion/success o /facturacion?status=error
```

#### GET /api/billing/transactions
```typescript
// Response: BillingTransaction[] (historial de pagos del usuario)
```

### Cron Jobs

#### GET /api/cron/expire-plans
```typescript
// Verifica y expira planes vencidos. Ejecutar diariamente.
// Header: Authorization: Bearer CRON_SECRET
```

#### GET /api/cron/recordatorio-mensual
```typescript
// Envía recordatorio de liquidación día 25 de cada mes.
// Header: Authorization: Bearer CRON_SECRET
```

#### GET /api/cron/update-indicadores
```typescript
// Actualiza indicadores previsionales del mes actual.
// Header: Authorization: Bearer CRON_SECRET
```

## Webhooks

### POST /api/webhooks/whatsapp
```typescript
// Meta Cloud API webhook verification (GET) + message handling (POST)
// Integra chatbot IA conversacional con Claude API
// Soporta simulación de liquidaciones vía conversación
```
