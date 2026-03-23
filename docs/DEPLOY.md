# Deploy — Gesti V3.1

## Plataforma: Vercel

Gesti usa Vercel para deploy automático de Next.js 14 con App Router.

## Prerequisitos

1. Cuenta Vercel (Pro o Hobby)
2. Repositorio conectado a Vercel (GitHub)
3. Proyecto Supabase de producción configurado
4. Dominio `gesti.cl` apuntando a Vercel
5. Cuentas activas en: Transbank (producción), Resend, Meta Cloud API

## Vercel Setup

### 1. Crear proyecto
```bash
# Opción A: CLI
npx vercel --prod

# Opción B: Dashboard
# Vercel.com → New Project → Import Git Repository → Seleccionar repo
```

### 2. Configuración del proyecto
- **Framework Preset:** Next.js
- **Root Directory:** `./` (raíz)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Node.js Version:** 18.x

### 3. Región
Configurado en `vercel.json` como `gru1` (São Paulo) para menor latencia en Chile.

## Variables de entorno

Configurar en Vercel Dashboard → Settings → Environment Variables:

| Variable | Scope | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | URL del proyecto Supabase producción |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Anon key de Supabase producción |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Service role key (NO exponer en client) |
| `NEXT_PUBLIC_APP_URL` | All | `https://gesti.cl` |
| `TBK_COMMERCE_CODE` | Production | Código comercio Transbank producción |
| `TBK_API_KEY` | Production | API key Transbank producción |
| `TBK_ENVIRONMENT` | Production | `production` |
| `TBK_COMMERCE_CODE` | Preview | Código comercio integración |
| `TBK_API_KEY` | Preview | API key integración |
| `TBK_ENVIRONMENT` | Preview | `integration` |
| `RESEND_API_KEY` | All | API key de Resend |
| `WHATSAPP_TOKEN` | Production | Token Meta Cloud API |
| `WHATSAPP_VERIFY_TOKEN` | Production | Token verificación webhook |
| `WHATSAPP_PHONE_NUMBER_ID` | Production | ID número teléfono WhatsApp |
| `ANTHROPIC_API_KEY` | Production | Claude API key para chatbot |
| `CRON_SECRET` | Production | Secret para autenticar cron jobs |

## Supabase Producción

### Migrar schema

```bash
# 1. Vincular proyecto producción
npx supabase link --project-ref <PROJECT_REF>

# 2. Aplicar todas las migraciones
npx supabase db push

# 3. Verificar tablas
npx supabase db reset --dry-run
```

### Verificar RLS
```sql
-- Confirmar RLS habilitado en todas las tablas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Verificar triggers
```sql
-- Confirmar trigger handle_new_user
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Cargar indicadores
Verificar que `indicadores_previsionales` tiene datos para el mes actual:
```sql
SELECT * FROM indicadores_previsionales
WHERE mes = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
```

## DNS — gesti.cl

### Configurar en registrador de dominio

| Tipo | Nombre | Valor |
|---|---|---|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

### En Vercel Dashboard
Settings → Domains → Add `gesti.cl` y `www.gesti.cl`

Vercel genera SSL automáticamente.

### Email (SPF/DKIM para Resend)
Agregar en DNS según instrucciones de Resend:
```
TXT  @     v=spf1 include:amazonses.com ~all
CNAME resend._domainkey  <valor-de-resend>
```

## Cron Jobs

Configurados en `vercel.json`:

| Job | Schedule | Descripción |
|---|---|---|
| `/api/cron/expire-plans` | Diario 06:00 UTC | Expira planes vencidos |
| `/api/cron/recordatorio-mensual` | Día 25, 12:00 UTC | Recuerda generar liquidaciones |
| `/api/cron/update-indicadores` | Día 1, 08:00 UTC | Actualiza indicadores del mes |

Los cron jobs de Vercel requieren plan Pro. En Hobby, usar servicio externo (cron-job.org, GitHub Actions).

## Functions Config

Configurado en `vercel.json`:
- **PDF generation routes:** 1024 MB RAM, 30s timeout (Chromium headless)
- **WhatsApp webhook:** 15s timeout
- **Cron jobs:** 60s timeout

## Checklist Pre-Deploy

### Base de datos
- [ ] Schema aplicado en Supabase producción (`npx supabase db push`)
- [ ] RLS habilitado en todas las tablas
- [ ] Trigger `handle_new_user` activo
- [ ] Indicadores previsionales del mes cargados
- [ ] Storage bucket `documentos` creado y público
- [ ] Si migración V2→V3: ejecutar script (ver `docs/MIGRACION_V2_V3.md`)

### Transbank
- [ ] Commerce code de producción configurado
- [ ] URL callback registrada: `https://gesti.cl/api/billing/callback`
- [ ] Prueba de pago exitosa en integración

### Email
- [ ] Dominio verificado en Resend
- [ ] SPF/DKIM configurados en DNS
- [ ] Email de prueba enviado correctamente

### WhatsApp
- [ ] Webhook URL registrada: `https://gesti.cl/api/webhooks/whatsapp`
- [ ] Verify token configurado
- [ ] Número de teléfono aprobado por Meta

### Vercel
- [ ] Variables de entorno configuradas (producción + preview)
- [ ] Dominio `gesti.cl` verificado y con SSL
- [ ] Build exitoso (`npm run build` sin errores)
- [ ] Preview deploy funcional

### Funcionalidad
- [ ] Login / Registro funcionando
- [ ] Crear contrato + generar PDF
- [ ] Generar liquidación con motor v3.1
- [ ] Pago con Transbank Webpay
- [ ] Envío de email transaccional
- [ ] Simulador público accesible sin login

## Rollback

```bash
# Revertir al deploy anterior
npx vercel rollback

# O desde el dashboard:
# Deployments → Seleccionar deploy anterior → Promote to Production
```

## Monitoreo

- **Vercel Analytics:** Dashboard → Analytics (Core Web Vitals)
- **Vercel Logs:** Dashboard → Logs (runtime errors, function invocations)
- **Supabase:** Dashboard → Logs (DB queries, auth events)
- **Resend:** Dashboard → Logs (email delivery, bounces)
