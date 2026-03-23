# Gesti V3.1

Plataforma web (PWA) para gestión laboral de Trabajadores de Casa Particular (TCP) en Chile. Permite crear contratos de trabajo, generar liquidaciones de sueldo, gestionar permisos y cumplir con la normativa laboral vigente.

## Stack tecnológico

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes + Server Actions
- **Base de datos:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **PDF:** puppeteer-core + @sparticuz/chromium
- **Email:** Resend (transaccional)
- **Pagos:** Transbank Webpay Plus
- **WhatsApp:** Meta Cloud API + Claude API (chatbot IA)

## Prerequisitos

- Node.js 18+
- npm 9+
- Cuenta Supabase con proyecto configurado
- Variables de entorno (ver sección siguiente)

## Variables de entorno

Crear archivo `.env.local` en la raíz:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sdobbpbagffmntjfcmuw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Transbank
TBK_COMMERCE_CODE=<commerce_code>
TBK_API_KEY=<api_key>
TBK_ENVIRONMENT=integration  # o production

# Resend (email)
RESEND_API_KEY=<resend_key>

# WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN=<token>
WHATSAPP_VERIFY_TOKEN=<verify_token>
WHATSAPP_PHONE_NUMBER_ID=<phone_id>

# Claude API (chatbot IA)
ANTHROPIC_API_KEY=<key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup local

```bash
# 1. Clonar repositorio
git clone <repo-url> && cd gesti-v3

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Aplicar migraciones a Supabase
npx supabase db push

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/                  # Login, registro, success
│   ├── (dashboard)/             # Panel principal
│   │   ├── contratos/           # CRUD contratos de trabajo
│   │   ├── liquidaciones/       # Generación de liquidaciones
│   │   ├── permisos/            # Gestión de permisos/vacaciones
│   │   ├── facturacion/         # Billing con Transbank
│   │   ├── cartola/             # Cartola anual de pagos
│   │   └── perfil/              # Perfil de usuario
│   ├── (public)/                # Landing, simuladores públicos
│   └── api/                     # Endpoints REST
│       ├── billing/             # Checkout, callback, plan
│       ├── calcular-liquidacion/# Simulador público
│       ├── contratos/           # CRUD + PDF
│       ├── cron/                # Tareas programadas
│       ├── indicadores/         # Indicadores previsionales
│       ├── liquidaciones/       # CRUD + PDF + envío
│       ├── notificaciones/      # Centro de notificaciones
│       ├── permisos/            # CRUD permisos
│       └── webhooks/            # WhatsApp webhook
├── components/
│   ├── ui/                      # shadcn/ui (button, card, table, badge)
│   ├── landing/                 # Hero, FAQ, Testimonios, etc.
│   ├── forms/                   # MultiStepForm, ContractForm, etc.
│   ├── simulador/               # Simulador público
│   ├── dashboard/               # Header, Sidebar, StatsCards, etc.
│   └── shared/                  # NotificationBell, ChatBubble
├── lib/
│   ├── calculos/                # Motor liquidación v3.1
│   ├── supabase/                # Clients browser/server/admin
│   ├── auth/                    # checkPlanAccess middleware
│   ├── transbank/               # Client Webpay Plus
│   ├── pdf/                     # Generación y upload PDF
│   ├── email/                   # Resend + templates
│   ├── whatsapp/                # Chatbot IA conversacional
│   ├── forms/                   # Engine y validación formularios
│   ├── types/                   # Tipos TypeScript compartidos
│   └── utils/                   # RUT, formato, cn
├── scripts/                     # Scripts de migración
└── templates/                   # HTML contratos + liquidaciones
```

## Comandos

```bash
npm run dev          # Servidor de desarrollo (localhost:3000)
npm run build        # Build de producción
npm start            # Iniciar build de producción
npm test             # Tests unitarios (vitest)
npm run lint         # ESLint
npx supabase db push # Aplicar migraciones SQL
```

## Deploy

Ver [docs/DEPLOY.md](docs/DEPLOY.md) para guía completa de deploy en Vercel.

Resumen rápido:
1. Conectar repositorio a Vercel
2. Configurar variables de entorno en Vercel dashboard
3. Framework preset: Next.js
4. Deploy automático en push a `main`

## Documentación

| Documento | Descripción |
|---|---|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Guía de deploy en Vercel |
| [docs/MIGRACION_V2_V3.md](docs/MIGRACION_V2_V3.md) | Script y proceso de migración V2→V3 |
| [docs/MIGRACION_STRIPE_A_TRANSBANK.md](docs/MIGRACION_STRIPE_A_TRANSBANK.md) | Migración de pagos Stripe→Transbank |
| [docs/context/](docs/context/) | Documentación técnica por módulo |
| [CLAUDE.md](CLAUDE.md) | Instrucciones para Claude Code |

## Planes

| Plan | Precio | Funcionalidades |
|---|---|---|
| Free | $0 | Simular contrato y liquidación |
| Pro Mensual | $9.900/mes | Contratos válidos + liquidaciones + PDF + soporte |
| Pro Anual | $95.040/año | Mismo Pro con 20% descuento |

## Licencia

Privado. Todos los derechos reservados.
