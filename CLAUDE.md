# CLAUDE.md — Gesti V3.1

## Proyecto
Plataforma web (PWA) para gestión laboral de Trabajadores de Casa Particular (TCP) en Chile.
Contratos de trabajo, liquidaciones de sueldo, permisos, facturación, cumplimiento legal.

## Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes + Server Actions
- **DB:** Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **PDF:** puppeteer-core + @sparticuz/chromium (en API Routes, NO Edge Functions)
- **Email:** Resend (transaccional)
- **Pagos:** Transbank Webpay Plus (`transbank-sdk`)
- **WhatsApp:** Meta Cloud API + Claude API (chatbot)

## Supabase
- URL: `https://sdobbpbagffmntjfcmuw.supabase.co`
- Tablas: user_profiles, user_billing, contratos, liquidaciones, permisos, indicadores_previsionales, indicadores_actualizacion_log, notificaciones, simulaciones, system_config
- Auth: Supabase Auth nativo. Trigger crea user_profiles on signup.
- Storage bucket: `documentos` (público)
- RLS habilitado en todas las tablas.

## Arquitectura de Carpetas
```
src/app/(auth)/          → Login, registro, success
src/app/(dashboard)/     → Contratos, liquidaciones, permisos, perfil, billing, cartola
src/app/(public)/        → Landing, simulador, simulador-contrato
src/app/api/             → Endpoints REST
src/components/          → UI reutilizable (ver context/components.md)
src/lib/calculos/        → Motor liquidación v3.1 (ver context/calculos.md)
src/lib/supabase/        → Clients browser/server
src/lib/auth/            → checkPlanAccess middleware
src/lib/transbank/       → Client Webpay Plus (ver docs/MIGRACION_STRIPE_A_TRANSBANK.md)
src/lib/pdf/             → Generación PDF (ver context/pdf.md)
src/lib/email/           → Resend + templates
src/lib/types/           → Tipos compartidos (ver context/types.md)
src/templates/           → HTML contratos + liquidaciones
```

## Motor de Cálculo — REGLAS CRÍTICAS
1. **IUSC sobre RLI:** `RLI = Bruto - AFP - Salud - APV_B` (Art. 42 N°1 DL 824). NUNCA sobre bruto.
2. **Bisección:** Calcula IUSC sobre `(mid - AFP(mid) - Salud(mid))`, no sobre `mid`.
3. **Cesantía TCP:** Trabajador = 0% SIEMPRE. Empleador = 3%.
4. **Reforma Previsional (Ley 21.735):** 4 nuevas cotizaciones empleador con gradualidad.
5. **Indicadores:** Tabla `indicadores_previsionales`, actualización mensual automática.
6. **APV:** Distinguir Régimen A (no afecta RLI) vs B (reduce RLI hasta 50 UF/mes).
7. **RIMA:** Campo obligatorio para meses con licencia médica parcial.
8. **motor_version:** `"v3.1"` en cada liquidación para auditoría.

## Indicadores Previsionales Marzo 2026
- UF: $39.841,72 | UTM: $69.889 | Sueldo Mínimo TCP: $539.000
- Tope AFP (90 UF): $3.585.755 | Tope Cesantía (135,2 UF): $5.386.601
- SIS: 1,54% | ISL: 0,93% | Indemnización: 1,11% | Cesantía emp: 3%
- Reforma: Cap.Indiv 0,1% | Expect.Vida 0,9% | Rentab.Proteg 0% (activa 08/2026)
- IUSC exento si RLI ≤ $943.501

## Plantillas de Contrato
1 plantilla HTML unificada con condicionales `{{#if}}` para 8 combinaciones:
tipoContrato (puertas_afuera|puertas_adentro) × jornada (full|part) × doc (rut|pasaporte)

## Identidad Visual
- Verde: `#6fc8a0` | Teal: `#135e5f` | Amarillo: `#ffde59` | Dark: `#2f2e40` | BG: `#f4f4f9`
- Fuente: Poppins (Google Fonts)
- Logo: `https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png`

## Planes
- Free: simular contrato + liquidación
- Pro Mensual ($9.900): contrato válido + liquidaciones + PDF + soporte
- Pro Anual ($95.040): mismo Pro con descuento 20%

## Contextos por Directorio
Cada módulo tiene su archivo de contexto en `docs/context/`:
- `calculos.md` — Motor v3.1, fórmulas, tabla IUSC, casos de prueba
- `types.md` — Tipos TypeScript compartidos (InputLiquidacion, ResultadoLiquidacion, etc.)
- `pdf.md` — Stack PDF, templates, variables
- `components.md` — Catálogo de componentes UI
- `api.md` — Contratos de API (endpoints, request/response)
- `supabase.md` — Schema SQL, RLS, triggers, indicadores
- `email.md` — Templates Resend, cron recordatorios
- `forms.md` — MultiStepForm, FormSteps contrato/liquidación/permisos

## Comandos
```bash
npm run dev          # Dev server
npm test             # Tests unitarios (vitest)
npm run lint         # ESLint
npm run build        # Build producción
npx supabase db push # Aplicar migraciones
```

## Desarrollo Paralelo
4 ramas: rama-a (infra/auth/DB), rama-b (motor/API), rama-c (contratos/PDF), rama-d (front/UX)
Tipos en `lib/types/` son propiedad de rama-b y son inmutables durante un sprint.
Al cierre de sprint: merge A→B→C→D→main, actualizar `docs/context/api.md`.

## Pagos — Transbank Webpay Plus
- **SDK:** `transbank-sdk` (NO Stripe)
- **Flujo:** checkout → redirect Webpay → callback → commit → activar plan
- **Sin suscripciones automáticas** — renovación manual del usuario
- **Sin billing portal** — UI propia en /facturacion
- **DB:** `user_billing` con columnas `tbk_order_id` y `tbk_token` (no stripe_*)
- **Tabla auxiliar:** `billing_transactions` para historial de pagos
- **ENV:** `TBK_COMMERCE_CODE`, `TBK_API_KEY`, `TBK_ENVIRONMENT`
- **Doc completa:** `docs/MIGRACION_STRIPE_A_TRANSBANK.md`

## Spec Completa
`docs/GESTI_V3.1_ESPECIFICACION_DEFINITIVA.md` — Documento maestro con todo el detalle.
