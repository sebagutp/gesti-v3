# context/api.md — Contratos de API

> **Actualizar al cierre de cada sprint con las firmas reales.**

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

### POST /api/auth/register
```typescript
// Delegado a Supabase Auth signUp
{ email: string; password: string; options: { data: { name: string; last_name: string } } }
```

### POST /api/auth/login
```typescript
// Delegado a Supabase Auth signInWithPassword
{ email: string; password: string }
```

## Endpoints Privados (requieren JWT en header Authorization)

### GET /api/contratos
```typescript
// Response: Contrato[] (filtrado por user_id via RLS)
```

### POST /api/contratos
```typescript
// Request: Omit<Contrato, 'id' | 'user_id' | 'created_at' | 'token' | 'estado' | 'pdf_url'>
// Response: Contrato (con id, token generados)
```

### POST /api/contratos/[id]/generar-pdf
```typescript
// No body. Genera PDF del contrato, sube a Storage, envía email, actualiza estado.
// Response: { pdf_url: string; estado: 'enviado' }
```

### GET /api/liquidaciones?contrato_id=UUID
```typescript
// Response: Liquidacion[]
```

### POST /api/liquidaciones
```typescript
// Request: { contrato_id, periodo, dias_licencia_medica?, horas_faltadas?, hh_extra?, anticipo?, otros_bonos? }
// Response: Liquidacion (con calculo JSONB completo)
```

### POST /api/liquidaciones/[id]/generar-pdf
```typescript
// Genera PDF liquidación + PDF resumen pagos. Sube a Storage.
// Response: { pdf_liquidacion_url, pdf_resumen_pagos_url }
```

### POST /api/liquidaciones/[id]/enviar
```typescript
// Envía email con links a PDFs. Actualiza estado = "enviada".
// Response: { enviado: true }
```

### GET/POST /api/permisos
```typescript
// GET: Permisos[] filtrado por contrato_id
// POST: { contrato_id, tipo, fecha_inicio, fecha_fin, observaciones? }
```

### GET /api/indicadores?mes=2026-03
```typescript
// Response: IndicadoresPrevisionales
```

### GET /api/billing/plan
```typescript
// Response: { plan_type, plan_status, start_date, end_date, has_active_plan, days_remaining }
```

### POST /api/billing/checkout
```typescript
// Request: { plan: 'Pro_Mensual' | 'Pro_Anual' }
// Crea transacción Webpay Plus, retorna URL de redirect
// Response: { success: true, data: { url: string, token: string } }
```

### GET /api/billing/callback
```typescript
// Callback de Transbank tras pago. Recibe token_ws en query params.
// Ejecuta commit(), actualiza user_billing y billing_transactions.
// Redirect a /facturacion/success o /facturacion?status=error
```

## Webhooks

### POST /api/webhooks/whatsapp
```typescript
// Meta Cloud API webhook verification + message handling
```
