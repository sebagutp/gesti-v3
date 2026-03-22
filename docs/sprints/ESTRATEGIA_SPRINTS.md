# GESTI V3.1 — Estrategia de Implementación Paralela

> **Consolas simultáneas:** 4 (A, B, C, D)  
> **Filosofía:** Evolutivo — primero replicar V2, luego nuevas features  
> **Sincronización:** Al cierre de cada sprint, merge + actualizar contratos API + docs  

---

## MAPA DE RAMAS Y RESPONSABILIDADES

```
           ┌──────────────┐
           │    main       │ ← merge al cierre de cada sprint
           └──────┬───────┘
      ┌───────────┼───────────┬───────────────┐
      ▼           ▼           ▼               ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Rama A   │ │ Rama B   │ │ Rama C   │ │ Rama D   │
│ INFRA +  │ │ MOTOR +  │ │ CONTRA-  │ │ FRONT +  │
│ AUTH +   │ │ CÁLCULOS │ │ TOS +    │ │ UX +     │
│ DB       │ │ + API    │ │ PDF +    │ │ FORMS    │
└──────────┘ └──────────┘ │ DOCS     │ └──────────┘
                          └──────────┘
```

---

## SPRINT 0 — FUNDACIÓN (Día 1-2)

> **Objetivo:** Base técnica compartida. Sin esto, nada funciona.  
> **Ejecuta:** Consola A (las demás esperan)

| HU | Título | Descripción | Criterio de aceptación |
|----|--------|-------------|------------------------|
| HU-000 | Scaffolding Next.js | `npx create-next-app@14 gesti-v3 --ts --tailwind --app --src-dir` + shadcn/ui init + estructura de carpetas completa | `npm run dev` funciona, todas las carpetas existen |
| HU-001 | Migración SQL Supabase | Ejecutar SQL completo (11 tablas + RLS + triggers + seed indicadores) via MCP Supabase | `SELECT count(*) FROM indicadores_previsionales` = 1 |
| HU-002 | Supabase client libs | `lib/supabase/client.ts` (browser) + `lib/supabase/server.ts` (server) + middleware auth | Import funciona en ambos contextos |
| HU-003 | ENV y configuración | `.env.local` con todas las variables. Verificar conexión Supabase. | `supabase.from('indicadores_previsionales').select()` retorna datos |
| HU-004 | CLAUDE.md + contextos | Crear `CLAUDE.md` raíz + archivos de contexto por directorio | Archivos existen y son referenciables |
| HU-005 | Git + ramas | Init repo, crear ramas `rama-a`, `rama-b`, `rama-c`, `rama-d` | 4 ramas creadas |

**Entregable Sprint 0:** Proyecto base que las 4 consolas clonan.

---

## SPRINT 1 — PARIDAD V2: CORE (Día 3-7)

> **Objetivo:** Replicar lo que V2 ya hace: auth, contratos, liquidaciones básicas.  
> **4 consolas en paralelo.**

### Rama A — Auth + Perfiles + Billing Shell

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-100 | Registro con Supabase Auth | Formulario registro (nombre, apellido, email, password). `user_profiles` se crea automáticamente via trigger. Redirige a `/success-registration`. |
| HU-101 | Login + sesión | Login email/password. Almacena sesión. Redirige a `/contratos`. |
| HU-102 | Logout + protección rutas | `ProtectedRoute` middleware. Logout limpia sesión, redirige a `/login`. |
| HU-103 | Perfil usuario (lectura) | Página `/perfil` muestra datos del usuario desde `user_profiles`. |
| HU-104 | Billing shell | Página `/facturacion` con planes Free/Pro/ProAnual. Botón "Ir a pagar" (mock). `checkPlanAccess()` retorna `{allowed: true}` siempre. |
| HU-105 | Layout dashboard | Sidebar (150px desktop, hamburger mobile) + Header (logo, plan badge, logout). Responsive. |

**Contrato API de Rama A:**
```typescript
// Exports que las otras ramas consumen:
// lib/supabase/client.ts → createBrowserClient()
// lib/supabase/server.ts → createServerClient()
// lib/auth/checkPlanAccess.ts → checkPlanAccess(userId, feature)
// middleware.ts → protege rutas /contratos, /liquidaciones, etc.
// components/dashboard/Sidebar.tsx, Header.tsx
```

### Rama B — Motor de Cálculo + API Simulador

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-110 | Motor liquidación v3.1 | `lib/calculos/liquidacion.ts` completo. IUSC sobre RLI. Bisección corregida. APV A/B. |
| HU-111 | Tests unitarios motor | 7 casos obligatorios pasan. `npm test` verde. |
| HU-112 | API calcular-liquidacion | `POST /api/calcular-liquidacion` público. Input → ResultadoLiquidacion. |
| HU-113 | Helpers de formato | `formatCLP()`, `formatPercent()`, `validarRUT()`, `formatearRUT()`. Tests. |
| HU-114 | Tipos compartidos | `lib/types/liquidacion.ts`, `lib/types/contrato.ts`, `lib/types/indicadores.ts`. Exportados para todas las ramas. |

**Contrato API de Rama B:**
```typescript
// POST /api/calcular-liquidacion
// Body: InputLiquidacion
// Response: ResultadoLiquidacion
// 
// Exports:
// lib/calculos/liquidacion.ts → calcularLiquidacion()
// lib/calculos/liquidacion.ts → resolverBrutoDesdeNeto()
// lib/calculos/liquidacion.ts → formatCLP(), formatPercent()
// lib/utils/rut.ts → validarRUT(), formatearRUT()
// lib/types/* → todos los tipos
```

### Rama C — Contratos + Generación PDF

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-120 | Plantilla HTML unificada contrato | 1 archivo HTML con condicionales `{{#if}}`. Cubre las 8 combinaciones. |
| HU-121 | Plantilla HTML liquidación | Template liquidación con secciones: haberes, descuentos, cotizaciones empleador, totales. |
| HU-122 | Plantilla resumen pagos empleador | Template con nuevas cotizaciones reforma incluidas. |
| HU-123 | Motor render templates | `renderTemplate(html, variables)` con reemplazo `{{var}}` y condicionales `{{#if}}`. |
| HU-124 | Generación PDF (puppeteer-core) | `app/api/generar-pdf/route.ts`. HTML → PDF → Buffer. Funciona en Next.js API Route. |
| HU-125 | Upload a Supabase Storage | `generarContratoPDF(contrato)` → sube PDF → retorna URL pública. |
| HU-126 | Templates email | 3 templates: contrato generado, liquidación lista, recordatorio mensual. Función `enviarEmail()` con Resend. |

**Contrato API de Rama C:**
```typescript
// POST /api/generar-pdf
// Body: { html: string, fileName: string }
// Response: { url: string }
//
// Exports:
// lib/pdf/render-template.ts → renderTemplate()
// lib/pdf/generar-contrato.ts → generarContratoPDF()
// lib/pdf/generar-liquidacion.ts → generarLiquidacionPDF(), generarResumenPagosPDF()
// lib/email/resend.ts → enviarEmailContrato(), enviarEmailLiquidacion()
// templates/contratos/contrato_tcp.html
// templates/liquidaciones/liquidacion_sueldo.html
// templates/liquidaciones/resumen_pagos.html
```

### Rama D — Frontend: Forms + Simulador + Listas

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-130 | MultiStepForm engine | Componente que recibe `FormStep[]`, renderiza 1 pregunta por pantalla, transiciones Framer Motion, validación Zod, progreso visual. |
| HU-131 | Simulador liquidación público | `/simulador` — formulario (sueldo, tipo, AFP, horas, email, opcionales) → resultado desglosado en 3 secciones. Consume `POST /api/calcular-liquidacion`. |
| HU-132 | Lista contratos | `/contratos` — grid de `ContractCard`. Estado vacío con CTA "Crear contrato". Consume Supabase directamente. |
| HU-133 | Detalle contrato | `/contratos/[id]` — datos en tarjetas colapsables + tabla de liquidaciones. Botones: agregar permiso, agregar liquidación. |
| HU-134 | Componentes UI base | `ContractCard`, `LiquidacionTable`, `StatsCards`, `CollapsibleCard`. Paleta Gesti. |

**Contrato API de Rama D:**
```typescript
// Exports:
// components/forms/MultiStepForm.tsx → <MultiStepForm steps={} onComplete={} />
// components/simulador/SimuladorLiquidacion.tsx
// components/simulador/ResultadoLiquidacion.tsx
// components/dashboard/ContractCard.tsx, LiquidacionTable.tsx, StatsCards.tsx
// NOTA: Rama D consume API de Rama B y datos Supabase de Rama A.
// NO implementa lógica de negocio, solo UI.
```

### 🔄 SINCRONIZACIÓN Sprint 1

```
1. Merge rama-a → main (auth + layout base)
2. Merge rama-b → main (motor + API + tipos)
3. Merge rama-c → main (PDF + templates + email)
4. Merge rama-d → main (UI + forms + simulador)
5. Resolver conflictos (mínimos si se respetan contratos)
6. Actualizar CONTRATOS_API.md con las firmas reales
7. Test E2E: registro → login → simulador → resultado
```

---

## SPRINT 2 — PARIDAD V2: FLUJOS COMPLETOS (Día 8-12)

> **Objetivo:** Contratos end-to-end, liquidaciones end-to-end. Emails. 
> **Al final de Sprint 2, Gesti V3.1 hace todo lo que V2 hacía.**

### Rama A — CRUD Contratos Backend + Lógica

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-200 | API CRUD contratos | `GET/POST /api/contratos`, `GET /api/contratos/[id]`. RLS funciona. |
| HU-201 | Generar contrato completo | `POST /api/contratos/[id]/generar-pdf` → selecciona plantilla → render → PDF → Storage → email → actualiza estado. |
| HU-202 | Cálculo horas totales | Recibe horarios → calcula horas semanales (restando colación si jornada ≥ 5h). Mismo algoritmo que V2. |
| HU-203 | Cálculo sueldo base desde líquido | Si tipo_sueldo = "liquido", calcular bruto con bisección. Guardar ambos campos. |

### Rama B — CRUD Liquidaciones Backend

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-210 | API CRUD liquidaciones | `GET/POST /api/liquidaciones`. Unique constraint contrato+periodo. |
| HU-211 | Generar liquidación completa | `POST /api/liquidaciones/[id]/generar-pdf` → calcular con motor v3.1 → PDF liquidación + PDF resumen → Storage → guardar JSONB calculo. |
| HU-212 | Enviar liquidación email | `POST /api/liquidaciones/[id]/enviar` → Resend con 2 links (liquidación + resumen). Actualiza estado = "enviada". |
| HU-213 | Auto-rellenar RIMA | Al crear liquidación nueva, buscar liquidación anterior del mismo contrato y copiar `sueldo_imponible` como RIMA. |

### Rama C — Formulario Contrato + Permisos

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-220 | Formulario contrato completo | `/contratos/nuevo` — 4 secciones con MultiStepForm. Bifurcaciones RUT/Pasaporte y tipo sueldo. Al completar → `POST /api/contratos` → generar PDF → email. |
| HU-221 | Schema Zod contrato | Validación completa con `contratoSchema.ts`. RUT validado. Campos condicionales. |
| HU-222 | CRUD permisos | `/permisos` — formulario + lista. Tipos: vacaciones, licencia médica, permiso sin/con goce, etc. |
| HU-223 | API permisos | `GET/POST /api/permisos`. Filtro por contrato_id. |

### Rama D — Formulario Liquidación + Vistas

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-230 | Formulario datos mensuales | `/liquidaciones/nueva/[contratoId]` — campos: vacaciones, licencia, inasistencia, horas extra, anticipo. On submit → API calcula y genera PDF. |
| HU-231 | Vista detalle liquidación | `/liquidaciones/[id]` — muestra resultado completo + links descarga PDF. |
| HU-232 | Cartola/vista consolidada | `/cartola` — contrato + últimas liquidaciones + saldos. |
| HU-233 | Landing page | `/` — hero, beneficios, proceso 4 pasos, testimonios, FAQs, footer. Paleta Gesti. |

### 🔄 SINCRONIZACIÓN Sprint 2

```
1. Merge en orden: A → B → C → D → main
2. Test E2E completo: registro → contrato → liquidación → email → cartola
3. Comparar con V2: simulador produce mismos resultados
4. Actualizar CONTRATOS_API.md con endpoints finales
5. Actualizar CLAUDE.md con estado actual
```

---

## SPRINT 3 — FEATURES NUEVAS V3.1 (Día 13-18)

> **Objetivo:** Todo lo nuevo que V2 no tenía.

### Rama A — Indicadores Automáticos + Cron

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-300 | Edge Function update-indicadores | Scraping Previred + SII. Validación rangos. Upsert. Log en `indicadores_actualizacion_log`. |
| HU-301 | Fallback y alertas | Si fallo → usar mes anterior → email admin via Resend. |
| HU-302 | pg_cron configuración | Día 1 de cada mes a las 08:00 UTC. Verificar con `SELECT * FROM cron.job`. |
| HU-303 | API indicadores | `GET /api/indicadores?mes=2026-03`. Retorna indicadores del mes. |

### Rama B — Billing + Planes Reales

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-310 | Integración Stripe | Checkout session → webhook → actualizar `user_billing`. |
| HU-311 | checkPlanAccess real | Consulta `user_billing`. Free: solo simulación. Pro: todo habilitado. |
| HU-312 | UI billing mejorada | Planes, precios, estado actual, botón upgrade, historial. |
| HU-313 | Webhook Stripe | `/api/webhooks/stripe` — eventos: checkout.session.completed, subscription.updated/deleted. |

### Rama C — Notificaciones + PWA

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-320 | Notificaciones DB + Realtime | Insertar notificaciones al generar contrato/liquidación. Suscripción Realtime en frontend. |
| HU-321 | Cron recordatorios | Día 25 + último día del mes → email a empleadores con plan activo. |
| HU-322 | PWA | Manifest, service worker, iconos 192/512, standalone mode. |
| HU-323 | Analytics | GA4 + GTM + Meta Pixel. Evento `Contrato_simulado`. |

### Rama D — WhatsApp + Chatbot IA

| HU | Título | Criterio de aceptación |
|----|--------|------------------------|
| HU-330 | Webhook WhatsApp | `/api/webhooks/whatsapp` — recibir mensajes Meta Cloud API. |
| HU-331 | Flujo simulación WA | Bot recorre FormSteps secuencialmente, retorna resultado formateado. |
| HU-332 | Chatbot IA legislación | Claude API para consultas libres sobre legislación laboral TCP. |
| HU-333 | Estado conversacional | Tabla en Supabase para persistir estado del flujo WA. |

### 🔄 SINCRONIZACIÓN Sprint 3

```
1. Merge A → B → C → D → main
2. Test E2E: flujo completo con plan Pro
3. Verificar indicadores se actualizan
4. Probar WhatsApp en sandbox
5. RELEASE V3.1 BETA
```

---

## SPRINT 4 — MIGRACIÓN + POLISH (Día 19-22)

> **Consola única o 2 consolas.**

| HU | Título | Consola |
|----|--------|---------|
| HU-400 | Script migración V2→V3 | A — Leer Google Sheets → mapear → upsert Supabase. Dry-run. |
| HU-401 | Ejecutar migración real | A — Con datos de producción. Verificar integridad. |
| HU-410 | QA cross-browser | D — Probar en Chrome, Safari, mobile. Comparar simulador con Asefy.cl. |
| HU-411 | SEO + performance | D — Meta tags, OG, sitemap, Lighthouse > 90. |
| HU-420 | Docs finales | C — Actualizar todos los docs, README, deploy guide. |
| HU-421 | Deploy producción | A — Vercel + Supabase prod. DNS gesti.cl. |

---

## REGLAS DE SINCRONIZACIÓN ENTRE RAMAS

### Antes de cada sprint:
1. Todas las consolas hacen `git pull main`
2. Leen `CONTRATOS_API.md` actualizado
3. Leen su `context/{rama}.md` específico

### Al cerrar cada sprint:
1. Cada rama documenta sus endpoints reales en `CONTRATOS_API.md`
2. Se actualiza `CLAUDE.md` con el estado actual
3. Merge en orden: A → B → C → D (minimiza conflictos)
4. Test de integración E2E
5. Tag de versión: `sprint-N-complete`

### Regla de oro para evitar desalineación:
> **Los tipos (`lib/types/*`) son propiedad de Rama B y son inmutables durante un sprint.** Si otra rama necesita un campo nuevo, lo solicita como PR a Rama B y espera al cierre del sprint.

---

## DEPENDENCIAS ENTRE RAMAS

```
Sprint 1:
  A ──(auth, supabase client)──→ B, C, D
  B ──(tipos, motor)──→ C, D
  C ──(PDF engine)──→ nadie (independiente)
  D ──(UI)──→ consume API de B

Sprint 2:
  A ──(CRUD contratos API)──→ C (form), D (vistas)
  B ──(CRUD liquidaciones API)──→ D (form, vistas)
  C ──(form contrato)──→ consume A
  D ──(forms, vistas)──→ consume A y B

Sprint 3:
  Todas independientes (indicadores, billing, notif, WA)
```
