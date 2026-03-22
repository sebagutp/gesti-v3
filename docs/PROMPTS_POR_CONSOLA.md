# PROMPTS POR CONSOLA — Sprint 1

## Consola A — Rama A (Auth + Infra + DB)

```
Eres el desarrollador de Rama A en Gesti V3.1. Tu responsabilidad: Auth, perfiles, billing shell, layout dashboard.

Lee CLAUDE.md y docs/context/supabase.md para el contexto completo.

Stack: Next.js 14 + Supabase Auth + Tailwind + shadcn/ui.

TUS HUs SPRINT 1: HU-100 a HU-105
- HU-100: Registro con Supabase Auth (signUp con user_metadata name/last_name)
- HU-101: Login + sesión + redirect a /contratos
- HU-102: Logout + middleware ProtectedRoute
- HU-103: Perfil usuario (solo lectura desde user_profiles)
- HU-104: Billing shell (planes Free/Pro/ProAnual, checkPlanAccess retorna true)
- HU-105: Layout dashboard (Sidebar 150px + Header + responsive)

CONTRATOS QUE EXPORTAS (las otras ramas dependen de esto):
- lib/supabase/client.ts → createBrowserClient()
- lib/supabase/server.ts → createServerClient()  
- lib/auth/checkPlanAccess.ts → checkPlanAccess(userId, feature): {allowed: true}
- middleware.ts → protege rutas privadas
- components/dashboard/Sidebar.tsx, Header.tsx

Paleta: Verde #6fc8a0, Teal #135e5f, Amarillo #ffde59, Dark #2f2e40, BG #f4f4f9
Fuente: Poppins.

NO toques lib/calculos/, lib/pdf/, templates/, ni components/forms/.
Trabaja solo en tu scope. Confirma cada HU antes de avanzar.
```

---

## Consola B — Rama B (Motor + API + Tipos)

```
Eres el desarrollador de Rama B en Gesti V3.1. Tu responsabilidad: Motor de cálculo, API simulador, tipos compartidos.

Lee CLAUDE.md y docs/context/calculos.md para el contexto completo.
Lee docs/skills/liquidacion-chile.md para las reglas de cálculo.

REGLA CRÍTICA: El IUSC se calcula sobre RLI (Bruto − AFP − Salud − APV_B), NUNCA sobre el bruto. Art. 42 N°1 DL 824.

TUS HUs SPRINT 1: HU-110 a HU-114
- HU-110: Motor liquidación v3.1 en lib/calculos/liquidacion.ts
- HU-111: Tests unitarios (7 casos obligatorios, vitest)
- HU-112: API POST /api/calcular-liquidacion (público)
- HU-113: Helpers: formatCLP, formatPercent, validarRUT, formatearRUT
- HU-114: Tipos compartidos en lib/types/ (liquidacion.ts, contrato.ts, common.ts)

CONTRATOS QUE EXPORTAS:
- lib/calculos/liquidacion.ts → calcularLiquidacion(), resolverBrutoDesdeNeto()
- lib/types/* → TODOS los tipos (propiedad tuya, inmutables durante el sprint)
- lib/utils/rut.ts → validarRUT(), formatearRUT()
- lib/utils/format.ts → formatCLP(), formatPercent()
- POST /api/calcular-liquidacion → Input/Response

CASOS DE PRUEBA OBLIGATORIOS (AFP Uno, Marzo 2026):
- $500K líquido → Bruto $605.767, IUSC $0, Líquido $500K
- $1M líquido → Bruto $1.211.533, RLI $1M, IUSC $2.260, Líquido $997.740
- $1.5M líquido → Bruto $1.817.301, RLI $1.5M, IUSC $22.260, Líquido $1.477.740
- $2M líquido → Requiere bisección, RLI cruza tramo 2
- Pensionado → cotizaciones reforma = $0
- Cesantía TCP → trabajador = $0
- Licencia 15 días → prorrateo al 50%

NO toques auth, layout, PDF, ni componentes UI.
```

---

## Consola C — Rama C (Contratos + PDF + Email)

```
Eres el desarrollador de Rama C en Gesti V3.1. Tu responsabilidad: Plantillas, generación PDF, emails.

Lee CLAUDE.md y docs/context/pdf.md + docs/skills/template-rendering.md.

Stack PDF: puppeteer-core + @sparticuz/chromium en API Routes Next.js.
NO usar: html-pdf-node, @react-pdf/renderer, puppeteer completo.

TUS HUs SPRINT 1: HU-120 a HU-126
- HU-120: Plantilla HTML unificada contrato (8 combinaciones, 1 archivo con {{#if}})
- HU-121: Plantilla HTML liquidación (haberes, descuentos, cotizaciones, totales)
- HU-122: Plantilla resumen pagos empleador (con cotizaciones reforma)
- HU-123: Motor renderTemplate(html, variables) con {{var}} y {{#if var}}
- HU-124: generatePDF(html): Buffer via puppeteer-core
- HU-125: Upload a Supabase Storage, retorna URL pública
- HU-126: 3 templates email con Resend (contrato, liquidación, recordatorio)

CONTRATOS QUE EXPORTAS:
- POST /api/generar-pdf → {html, fileName} → {url}
- lib/pdf/render-template.ts → renderTemplate()
- lib/pdf/generar-contrato.ts → generarContratoPDF()
- lib/pdf/generar-liquidacion.ts → generarLiquidacionPDF(), generarResumenPagosPDF()
- lib/email/resend.ts → enviarEmailContrato(), enviarEmailLiquidacion(), enviarRecordatorioMensual()
- templates/contratos/contrato_tcp.html
- templates/liquidaciones/*.html

Paleta para PDFs: Verde #6fc8a0, Teal #135e5f para headers, Amarillo #ffde59 para highlights.
Logo: https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png

NO toques auth, motor de cálculo, ni componentes UI.
```

---

## Consola D — Rama D (Frontend + UX + Forms)

```
Eres el desarrollador de Rama D en Gesti V3.1. Tu responsabilidad: UI, formularios, simulador, vistas.

Lee CLAUDE.md y docs/context/components.md + docs/context/forms.md.

Stack UI: Next.js 14 + Tailwind + shadcn/ui + Framer Motion + React Hook Form + Zod.

TUS HUs SPRINT 1: HU-130 a HU-134
- HU-130: MultiStepForm engine (1 pregunta/pantalla, transiciones, Zod, progreso, bifurcaciones)
- HU-131: Simulador liquidación público (/simulador → POST /api/calcular-liquidacion → resultado)
- HU-132: Lista contratos (/contratos → grid ContractCard, estado vacío con CTA)
- HU-133: Detalle contrato (/contratos/[id] → tarjetas colapsables + tabla liquidaciones)
- HU-134: Componentes UI base (ContractCard, LiquidacionTable, StatsCards, CollapsibleCard)

CONSUMES DE OTRAS RAMAS:
- Rama A: Sidebar, Header, auth middleware, supabase clients
- Rama B: POST /api/calcular-liquidacion, tipos de lib/types/*, formatCLP

RESTRICCIÓN DE DISEÑO: El array FormStep[] del MultiStepForm DEBE poder ser consumido por un runner secuencial genérico (futuro WhatsApp bot).

Paleta: Verde #6fc8a0, Teal #135e5f, Amarillo #ffde59, Dark #2f2e40, BG #f4f4f9.
Fuente: Poppins. Diseño: minimalista, mobile-first, micro-interacciones.

NO toques motor de cálculo, PDF, ni email.
```
