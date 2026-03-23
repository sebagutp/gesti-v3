# Supabase — Gesti V3.1

## Proyecto
- **URL:** https://sdobbpbagffmntjfcmuw.supabase.co
- **Región:** sa-east-1 (São Paulo)
- **API Key (anon):** En `.env.local` como `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key:** En `.env.local` como `SUPABASE_SERVICE_ROLE_KEY` (servidor solo)

---

## Tablas Principales

### 1. `auth.users` (Supabase Auth nativo)
- Gestión de login, registro, reset password
- Trigger automático `handle_new_user` crea perfil en `user_profiles`

### 2. `public.user_profiles`
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  apellido TEXT,
  avatar_url TEXT,
  rol TEXT DEFAULT 'employer',  -- employer|worker
  plan_type TEXT DEFAULT 'Free',
  plan_status TEXT DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**RLS:** `SELECT/UPDATE/DELETE` donde `auth.uid() = id`

### 3. `public.user_billing`
```sql
CREATE TABLE user_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_type TEXT,  -- Free|Pro_Mensual|Pro_Anual
  plan_status TEXT,  -- active|expired|cancelled
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  tbk_order_id TEXT,       -- Último buy_order de Transbank
  tbk_token TEXT,          -- Token última transacción Webpay exitosa
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**RLS:** `SELECT` donde `auth.uid() = user_id`

### 4. `public.contratos`
```sql
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),

  -- Empleador
  razon_social TEXT NOT NULL,
  rut_empresa TEXT,
  nombre_empleador TEXT,
  email_empleador TEXT,

  -- Trabajador
  nombre_trabajador TEXT NOT NULL,
  apellidos_trabajador TEXT,
  tipo_documento TEXT,  -- rut|pasaporte
  numero_documento TEXT,
  email_trabajador TEXT,
  domicilio_trabajador TEXT,

  -- Contrato
  tipo_contrato TEXT,  -- puertas_afuera|puertas_adentro
  tipo_jornada TEXT,  -- full|part
  sueldo_base NUMERIC,
  tipo_sueldo TEXT,  -- liquido|imponible|bruto
  afp TEXT,
  fecha_inicio DATE,
  fecha_termino DATE,

  -- Beneficios
  gratificacion BOOLEAN DEFAULT false,
  colacion NUMERIC DEFAULT 0,
  movilizacion NUMERIC DEFAULT 0,
  otros_bonos NUMERIC DEFAULT 0,

  -- Estado
  estado TEXT DEFAULT 'borrador',  -- borrador|generado|enviado|activo|terminado
  pdf_url TEXT,
  token TEXT UNIQUE,
  vigente BOOLEAN DEFAULT true,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**RLS:** `SELECT/UPDATE` donde `auth.uid() = user_id`
**Índices:** `(user_id, estado)`, `(token)`

### 5. `public.liquidaciones`
```sql
CREATE TABLE liquidaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),

  periodo TEXT NOT NULL,  -- YYYY-MM
  estado TEXT DEFAULT 'borrador',  -- borrador|generada|enviada|pagada

  -- Días y horas
  dias_trabajados INTEGER,
  dias_licencia_medica INTEGER DEFAULT 0,
  horas_extra INTEGER DEFAULT 0,
  rima NUMERIC,  -- Obligatorio si dias_licencia < 30

  -- Descuentos y bonos
  anticipo NUMERIC DEFAULT 0,
  otros_bonos NUMERIC DEFAULT 0,
  apv_monto NUMERIC DEFAULT 0,
  apv_regimen TEXT,  -- A|B

  -- Resultado (JSONB para auditoría)
  calculo JSONB NOT NULL,  -- ResultadoLiquidacion completo

  -- PDFs
  pdf_liquidacion_url TEXT,
  pdf_resumen_url TEXT,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**RLS:** `SELECT/UPDATE` donde `auth.uid() = user_id`
**Índices:** `(contrato_id, periodo)`, `(user_id, periodo)`
**JSONB:** `calculo` contiene todo `ResultadoLiquidacion` para auditoría

### 6. `public.permisos`
```sql
CREATE TABLE permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id),
  user_id UUID REFERENCES user_profiles(id),

  tipo TEXT NOT NULL,  -- vacaciones|licencia_enfermedad|licencia_parental|permiso_sin_pago
  fecha_inicio DATE,
  fecha_fin DATE,
  dias INTEGER,
  observaciones TEXT,

  estado TEXT DEFAULT 'pendiente',  -- pendiente|aprobado|rechazado

  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**RLS:** `SELECT/INSERT/UPDATE` donde `auth.uid() = user_id`

### 7. `public.indicadores_previsionales`
```sql
CREATE TABLE indicadores_previsionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes TEXT NOT NULL UNIQUE,  -- 2026-03

  -- Valores UF, UTM
  uf NUMERIC NOT NULL,
  utm NUMERIC NOT NULL,
  sueldo_minimo_tcp NUMERIC NOT NULL,

  -- AFP tasas (JSONB)
  afp_tasas JSONB,  -- { "Uno": { "tasa_obligatoria": 10.45, "tasa_seguro": 1.47 }, ... }

  -- Tramos IUSC (JSONB array)
  tramos_iusc JSONB,  -- [{ "rli_hasta": 943501, "factor": 0, "rebaja": 0 }, ...]

  -- Topes
  tope_afp NUMERIC,
  tope_cesantia NUMERIC,

  -- Tasas empleador
  tasa_sis NUMERIC,
  tasa_isl NUMERIC,
  tasa_indemnizacion NUMERIC,

  -- Reforma previsional (JSONB)
  reforma JSONB,  -- { "cap_individual_afp": 0.001, "expectativa_vida": 0.009, ... }

  rli_exento_hasta NUMERIC,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**RLS:** Public read, admin write only
**Índices:** `(mes)`
**Populated by:** Rama A en migraciones iniciales, actualizado manualmente o vía script

### 8. `public.indicadores_actualizacion_log`
```sql
CREATE TABLE indicadores_actualizacion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_anterior TEXT,
  mes_nuevo TEXT,
  cambios JSONB,  -- Diferencias detectadas
  actualizado_por TEXT,  -- admin email
  created_at TIMESTAMP
)
```

### 9. `public.notificaciones`
```sql
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  tipo TEXT,  -- email_enviado|email_entregado|email_bounce|reminder_liquidacion
  contenido JSONB,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)
```

### 10. `public.simulaciones`
```sql
CREATE TABLE simulaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- No requiere login
  email TEXT,

  -- Datos simulación
  tipo TEXT,  -- contrato|liquidacion
  params JSONB,  -- InputLiquidacion o ContratoInput
  resultado JSONB,  -- ResultadoLiquidacion o Contrato

  created_at TIMESTAMP
)
```

**RLS:** Public insert (anon users), private select
**Limpieza:** Trigger para borrar registros > 30 días

### 11. `public.system_config`
```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,  -- reforma_gradualidad_activa, feature_whatsapp_bot, etc.
  valor TEXT,
  tipo TEXT,  -- boolean|number|string
  actualizado_por TEXT,
  updated_at TIMESTAMP
)
```

---

## Row-Level Security (RLS)

**Habilitado en:** user_profiles, user_billing, contratos, liquidaciones, permisos, notificaciones, simulaciones

### Patrón Estándar
```sql
-- User only sees own data
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_contratos"
  ON contratos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_update_own_contratos"
  ON contratos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_delete_own_contratos"
  ON contratos FOR DELETE
  USING (auth.uid() = user_id);
```

### Público (simulaciones)
```sql
-- Anon users can insert
CREATE POLICY "anon_insert_simulaciones"
  ON simulaciones FOR INSERT
  WITH CHECK (true);

-- Users see own
CREATE POLICY "user_select_own_simulaciones"
  ON simulaciones FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
```

---

## Triggers y Functions

### `handle_new_user()`
Se ejecuta cuando `auth.users` inserta un nuevo usuario.
```sql
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles(id, email, created_at)
  VALUES (new.id, new.email, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Storage

### Bucket: `documentos`
- **Público:** True (anyone can read)
- **Ruta:** `/contratos/{contrato_id}.pdf` y `/liquidaciones/{liquidacion_id}.pdf`
- **Limpieza:** 90 días automático via lifecycle policy

---

## Migrations

Ubicación: `supabase/migrations/`

Ejecutar con:
```bash
npx supabase db push
```

---

## Client Libraries

### Browser
```typescript
import { createBrowserClient } from '@supabase/ssr'
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

### Server
```typescript
import { createServerClient } from '@supabase/ssr'
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

---

## Auditoría

- `created_at`, `updated_at` en todas las tablas
- JSONB `calculo` y `params` para historial de cambios
- `indicadores_actualizacion_log` para auditar cambios de tasas
- Logs de notificaciones (`notificaciones` tabla)
