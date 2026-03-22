# Gesti V3.1 — Documentación

> Documentación técnica completa para el desarrollo de Gesti V3.1

## Estructura de Documentación

```
docs/
├── README.md (este archivo)
├── CLAUDE.md (también en raíz)
├── GESTI_V3.1_ESPECIFICACION_DEFINITIVA.md — Spec maestro del proyecto
├── PROMPTS_POR_CONSOLA.md — Prompts para desarrollo asistido
│
├── context/ — Documentación por módulo (propiedad de Rama B)
│   ├── calculos.md — Motor de cálculo v3.1, algoritmos, test cases
│   ├── types.md — Tipos TypeScript compartidos (InputLiquidacion, etc.)
│   ├── api.md — Contratos de API (endpoints, request/response)
│   ├── pdf.md — Generación PDF (puppeteer, templates, variables)
│   ├── components.md — Catálogo UI (paleta, componentes, design system)
│   ├── supabase.md — Schema, RLS, triggers, tablas
│   ├── email.md — Emails (Resend, templates, webhooks)
│   └── forms.md — Sistema de formularios (MultiStepForm, serialización)
│
├── hu/ — User Stories por sprint
│   ├── sprint-0/ — Fundacional (HU-000 a HU-005)
│   ├── sprint-1/ — Principal (HU-100 a HU-134, 4 ramas)
│   ├── sprint-2/ — Continuación
│   ├── sprint-3/ — WhatsApp bot, features avanzadas
│   └── sprint-4/ — Features finales
│
├── sprints/
│   └── ESTRATEGIA_SPRINTS.md — Estrategia de trabajo por sprint
│
└── skills/
    └── SKILLS.md — Habilidades y competencias requeridas
```

## Archivos Principales

### CLAUDE.md
- Descripción general del proyecto
- Tech stack (Next.js, Supabase, Puppeteer, Resend, Stripe)
- Reglas críticas del motor de cálculo
- Identidad visual y branding
- Estructura de carpetas

### Contextos por Módulo (docs/context/)

#### `calculos.md`
Documentación del motor de cálculo v3.1 (Rama B).

**Contiene:**
- Marco legal: Art. 42 DL 824, Ley 21.735
- Algoritmo de 11 pasos para liquidación
- Bisección para resolver sueldo desde líquido
- Tabla IUSC (7 tramos, Marzo 2026)
- APV Régimen A vs B
- Asignación familiar (4 tramos)
- Reforma Previsional (4 cotizaciones nuevas)
- RIMA para licencia médica parcial
- Casos de prueba con valores esperados

**Propietario:** Rama B (inmutable durante sprint)

#### `types.md`
Tipos TypeScript compartidos.

**Incluye:**
- InputLiquidacion (15 campos)
- ResultadoLiquidacion (haberes, descuentos, cotizaciones)
- IndicadoresPrevisionales (tasas, tramos, topes)
- Contrato (empleador, trabajador, datos)
- Enums: PlanType, Feature
- FormStep (serializable para WhatsApp bot)

**Propietario:** Rama B

#### `pdf.md`
Generación de PDF (Rama C).

**Stack:** puppeteer-core + @sparticuz/chromium

**Incluye:**
- 3-step pipeline: render → generate → upload
- Plantilla unificada (8 combinaciones contrato)
- Variables de contexto
- Identidad visual (colores, fonts, logo)
- Ejemplo de implementación en API Routes

#### `components.md`
Catálogo de componentes UI (Rama D).

**Incluye:**
- Paleta: Verde (#6fc8a0), Teal (#135e5f), Amarillo (#ffde59)
- Tipografía: Poppins (5 weights)
- Componentes base: shadcn/ui
- Componentes custom: Sidebar, Header, Cards, Tables, Forms, etc.
- Design principles (mobile-first, a11y, transiciones)

#### `api.md`
Contratos de API (endpoints públicos y privados).

**Públicos:**
- POST /api/calcular-liquidacion
- POST /api/auth/register, /login

**Privados (JWT):**
- CRUD contratos, liquidaciones, permisos
- PDF generation y envío
- Webhooks Stripe y WhatsApp

#### `supabase.md`
Base de datos y backend (Rama A).

**Contiene:**
- 11 tablas con SQL schemas
- RLS policies (row-level security)
- Triggers (handle_new_user)
- Storage (documentos bucket)
- Client libraries

#### `email.md`
Sistema de emails (Transaccional con Resend).

**Funciones:**
- enviarEmailContrato
- enviarEmailLiquidacion
- enviarRecordatorioMensual (cron)

**Templates:** Handlebars con variables

#### `forms.md`
Sistema de formularios (MultiStepForm).

**Características:**
- 1 pregunta por pantalla (Typeform-like)
- Validación Zod
- Transiciones Framer Motion
- CRÍTICO: FormStep[] serializable (para WhatsApp bot)

**Formularios:**
- Contrato (4 secciones, ~25-30 pasos)
- Liquidación (3 secciones, ~10-15 pasos)
- Permisos (3 secciones, ~5-6 pasos)

---

## Especificación Maestra

### GESTI_V3.1_ESPECIFICACION_DEFINITIVA.md (62 KB)
Documento maestro con:
- Requisitos funcionales completos
- Casos de uso
- Diagrama de flujos
- Detalles técnicos por módulo
- Estándares de calidad

---

## User Stories (HU)

Organizadas por sprint y rama:

### Sprint 0 (Fundacional)
- HU-000: Setup inicial
- HU-001: Auth
- HU-002: Contratos
- HU-003: Liquidaciones
- HU-004: **Este HU** — Documentación
- HU-005: Configuración

### Sprint 1 (Principal)
Dividido en 4 ramas paralelas:

**Rama A (Infra/Auth/DB):**
- HU-100-105: Infraestructura, Auth nativa, Schema

**Rama B (Motor/API):**
- HU-110-114: Motor cálculo, API endpoints

**Rama C (Contratos/PDF):**
- HU-120-126: Templates, PDF generation

**Rama D (Frontend/UX):**
- HU-130-134: Componentes, formularios, dashboard

---

## Usando Esta Documentación

### Para desarrolladores en Rama B
1. Lee `CLAUDE.md` para contexto general
2. Estudia `docs/context/types.md` (tipos que defines)
3. Implementa según `docs/context/calculos.md`
4. Expone en `docs/context/api.md`
5. Prueba contra casos en `docs/context/calculos.md`

### Para desarrolladores en Rama C
1. Lee `docs/context/pdf.md`
2. Usa templates en `src/templates/`
3. Invoca API de Rama B según `docs/context/api.md`
4. Sube a Storage Supabase

### Para desarrolladores en Rama D
1. Lee `docs/context/components.md`
2. Consulta `docs/context/forms.md`
3. Integra con API de Rama B
4. Aplica colores y tipografía de diseño

---

## Contexto de Actualización

Los archivos de contexto se actualizan:
- **Después de cada sprint:** Merge A→B→C→D→main, actualizar `api.md`
- **Mensualmente:** `indicadores_previsionales` en Supabase
- **Bajo demanda:** Si cambian requisitos o arquitectura

---

## Contacto y Preguntas

Consulta:
1. El archivo específico de tu módulo en `docs/context/`
2. La especificación maestra (`GESTI_V3.1_ESPECIFICACION_DEFINITIVA.md`)
3. Los HUs de tu sprint en `docs/hu/sprint-X/`

---

**Versión:** Gesti V3.1  
**Última actualización:** Marzo 2026  
**Motor de cálculo:** v3.1  
**Indicadores:** Marzo 2026
