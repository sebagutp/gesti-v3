-- ════════════════════════════════════════════════════
-- GESTI V3.1 — MIGRACIÓN SUPABASE COMPLETA
-- Ejecutar en: SQL Editor de Supabase Dashboard
-- Proyecto: sdobbpbagffmntjfcmuw
-- ════════════════════════════════════════════════════

-- 1. PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rut TEXT,
  phone TEXT,
  address TEXT,
  comuna TEXT,
  role TEXT DEFAULT 'empleador' CHECK (role IN ('empleador', 'trabajador', 'admin')),
  profile_completed BOOLEAN DEFAULT false,
  first_contract_created BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, last_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name',''), COALESCE(NEW.raw_user_meta_data->>'last_name',''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. FACTURACIÓN
CREATE TABLE IF NOT EXISTS public.user_billing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro_mensual', 'pro_anual')),
  plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'inactive', 'cancelled', 'trial')),
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own billing" ON public.user_billing FOR SELECT USING (auth.uid() = user_id);


-- 3. CONTRATOS
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador','activo','enviado','firmado','terminado','simulado')),

  rut_empleador TEXT NOT NULL,
  nombres_empleador TEXT NOT NULL,
  apellidos_empleador TEXT NOT NULL,
  correo_empleador TEXT NOT NULL,
  direccion_empleador TEXT,
  comuna_empleador TEXT,

  rut_trabajador TEXT,
  pasaporte_trabajador TEXT,
  documento_tipo TEXT CHECK (documento_tipo IN ('rut', 'pasaporte')),
  nombres_trabajador TEXT NOT NULL,
  apellidos_trabajador TEXT NOT NULL,
  correo_trabajador TEXT,
  nacimiento_trabajador DATE,
  nacionalidad_trabajador TEXT,
  afp_trabajador TEXT,
  salud_trabajador TEXT DEFAULT 'Fonasa',
  direccion_trabajador TEXT,
  comuna_trabajador TEXT,

  jornada TEXT CHECK (jornada IN ('full_time', 'part_time')),
  tipo_contrato TEXT CHECK (tipo_contrato IN ('puertas_afuera', 'puertas_adentro')),
  horarios JSONB DEFAULT '{}',
  colacion_inicio TEXT,
  colacion_fin TEXT,
  total_horas_semanales NUMERIC(5,2),
  dias_semana INTEGER,

  tareas_hogar TEXT[],
  tareas_exterior TEXT[],
  tareas_adicionales TEXT,
  fecha_inicio DATE,
  tipo_sueldo TEXT CHECK (tipo_sueldo IN ('imponible', 'liquido')),
  sueldo_base NUMERIC(12,0),
  sueldo_liquido NUMERIC(12,0),
  asignacion_colacion NUMERIC(12,0) DEFAULT 0,
  asignacion_movilizacion NUMERIC(12,0) DEFAULT 0,
  direccion_trabajo TEXT,
  comuna_trabajo TEXT,

  es_pensionado BOOLEAN DEFAULT false,
  mayor_65 BOOLEAN DEFAULT false,
  exento_cotizacion BOOLEAN DEFAULT false,
  cargas_familiares INTEGER DEFAULT 0,
  apv_regimen TEXT CHECK (apv_regimen IN ('A', 'B')),

  pdf_url TEXT,
  plantilla_usada TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own" ON public.contratos FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_user ON public.contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_token ON public.contratos(token);


-- 4. LIQUIDACIONES
CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  periodo TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','calculada','enviada','pagada')),

  dias_trabajados INTEGER DEFAULT 30,
  dias_licencia_medica INTEGER DEFAULT 0,
  dias_vacaciones INTEGER DEFAULT 0,
  horas_faltadas NUMERIC(6,2) DEFAULT 0,
  hh_extra NUMERIC(6,2) DEFAULT 0,
  anticipo NUMERIC(12,0) DEFAULT 0,
  otros_bonos NUMERIC(12,0) DEFAULT 0,
  prevision_voluntaria NUMERIC(12,0) DEFAULT 0,
  apv_regimen TEXT CHECK (apv_regimen IN ('A', 'B')),
  rima NUMERIC(12,0),

  calculo JSONB DEFAULT '{}',

  sueldo_imponible NUMERIC(12,0),
  sueldo_liquido NUMERIC(12,0),
  total_pago_trabajador NUMERIC(12,0),
  total_cotizaciones_empleador NUMERIC(12,0),
  total_previred NUMERIC(12,0),
  costo_total_empleador NUMERIC(12,0),

  pdf_liquidacion_url TEXT,
  pdf_resumen_pagos_url TEXT,
  indicadores_usados JSONB,
  motor_version TEXT DEFAULT 'v3.1',

  fecha_pago DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own" ON public.liquidaciones FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_liq_contrato ON public.liquidaciones(contrato_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_liq_contrato_periodo ON public.liquidaciones(contrato_id, periodo);


-- 5. PERMISOS
CREATE TABLE IF NOT EXISTS public.permisos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'vacaciones','licencia_medica','permiso_sin_goce','permiso_con_goce',
    'feriado_legal','dia_administrativo','licencia_maternal','licencia_paternal'
  )),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_habiles INTEGER,
  observaciones TEXT,
  documento_url TEXT,
  estado TEXT DEFAULT 'solicitado' CHECK (estado IN ('solicitado','aprobado','rechazado','cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own" ON public.permisos FOR ALL USING (auth.uid() = user_id);


-- 6. INDICADORES PREVISIONALES
CREATE TABLE IF NOT EXISTS public.indicadores_previsionales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_vigencia TEXT NOT NULL UNIQUE,
  uf NUMERIC(12,2), utm NUMERIC(12,0), uta NUMERIC(12,0),
  sueldo_minimo NUMERIC(12,0) DEFAULT 539000,
  sueldo_minimo_menores NUMERIC(12,0) DEFAULT 402082,
  sueldo_minimo_tcp NUMERIC(12,0) DEFAULT 539000,
  renta_tope_afp NUMERIC(12,0),
  renta_tope_inp NUMERIC(12,0),
  renta_tope_cesantia NUMERIC(12,0),
  tasas_afp JSONB,
  tasa_salud NUMERIC(6,4) DEFAULT 0.07,
  tasa_sis NUMERIC(6,4) DEFAULT 0.0154,
  tasa_accidentes_trabajo NUMERIC(6,4) DEFAULT 0.0093,
  tasa_indemnizacion NUMERIC(6,4) DEFAULT 0.0111,
  tasa_cesantia_empleador NUMERIC(6,4) DEFAULT 0.03,
  tasa_ley_sanna NUMERIC(6,4) DEFAULT 0.0003,
  tasa_afp_empleador NUMERIC(6,4) DEFAULT 0.001,
  tasa_expectativa_vida NUMERIC(6,4) DEFAULT 0.009,
  tasa_rentabilidad_protegida NUMERIC(6,4) DEFAULT 0,
  tramos_asignacion_familiar JSONB,
  tramos_impuesto_mensual JSONB,
  tope_apv_mensual NUMERIC(12,0),
  tope_apv_anual NUMERIC(12,0),
  fuente TEXT DEFAULT 'previred.com',
  actualizado_por TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- 7. LOG DE ACTUALIZACIÓN DE INDICADORES
CREATE TABLE IF NOT EXISTS public.indicadores_actualizacion_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_vigencia TEXT NOT NULL,
  estado TEXT CHECK (estado IN ('ok', 'fallido', 'pendiente')),
  fuente TEXT,
  errores JSONB,
  valores_parseados JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 8. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'contrato_generado','liquidacion_lista','pago_pendiente',
    'permiso_aprobado','recordatorio_liquidacion','plan_por_vencer',
    'indicadores_actualizados','firma_pendiente'
  )),
  titulo TEXT NOT NULL,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  canal TEXT DEFAULT 'app' CHECK (canal IN ('app','email','whatsapp','push')),
  enviada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own" ON public.notificaciones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own" ON public.notificaciones FOR UPDATE USING (auth.uid() = user_id);


-- 9. SIMULACIONES (público, sin auth)
CREATE TABLE IF NOT EXISTS public.simulaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  tipo TEXT CHECK (tipo IN ('liquidacion', 'contrato')),
  input JSONB NOT NULL,
  resultado JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 10. CONFIG SISTEMA
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config (key, value) VALUES
  ('gradualidad_reforma', '{
    "2025-08":{"afp_emp":0.001,"expectativa":0.009,"rentabilidad":0,"sis_ss":0},
    "2026-08":{"afp_emp":0.001,"expectativa":0.010,"rentabilidad":0.009,"sis_ss":0.015},
    "2027-08":{"afp_emp":0.0025,"expectativa":0.010,"rentabilidad":0.015,"sis_ss":0.015},
    "2028-08":{"afp_emp":0.010,"expectativa":0.010,"rentabilidad":0.015,"sis_ss":0.015}
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- 11. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════
-- SEED: INDICADORES MARZO 2026
-- ════════════════════════════════════════════════════

INSERT INTO indicadores_previsionales (
  mes_vigencia, uf, utm, uta, sueldo_minimo, sueldo_minimo_tcp,
  renta_tope_afp, renta_tope_cesantia,
  tasas_afp, tasa_salud, tasa_sis, tasa_accidentes_trabajo,
  tasa_indemnizacion, tasa_cesantia_empleador,
  tasa_afp_empleador, tasa_expectativa_vida, tasa_rentabilidad_protegida,
  tasa_ley_sanna, tope_apv_mensual,
  tramos_asignacion_familiar, tramos_impuesto_mensual
) VALUES (
  '2026-03', 39841.72, 69889, 838668, 539000, 539000,
  3585755, 5386601,
  '{"Capital":{"trabajador":0.1144,"total":0.1154},"Cuprum":{"trabajador":0.1144,"total":0.1154},"Habitat":{"trabajador":0.1127,"total":0.1137},"PlanVital":{"trabajador":0.1116,"total":0.1126},"Provida":{"trabajador":0.1145,"total":0.1155},"Modelo":{"trabajador":0.1058,"total":0.1068},"Uno":{"trabajador":0.1046,"total":0.1056}}'::jsonb,
  0.07, 0.0154, 0.0093, 0.0111, 0.03,
  0.001, 0.009, 0, 0.0003, 1992086,
  '[{"tramo":"A","monto":22007,"renta_hasta":631976},{"tramo":"B","monto":13505,"renta_hasta":923067},{"tramo":"C","monto":4267,"renta_hasta":1439668},{"tramo":"D","monto":0,"renta_hasta":null}]'::jsonb,
  '[{"desde":0,"hasta":943501,"factor":0,"rebaja":0},{"desde":943502,"hasta":2096670,"factor":0.04,"rebaja":37740},{"desde":2096671,"hasta":3494450,"factor":0.08,"rebaja":121607},{"desde":3494451,"hasta":4892230,"factor":0.135,"rebaja":313802},{"desde":4892231,"hasta":6290010,"factor":0.23,"rebaja":778563},{"desde":6290011,"hasta":8386680,"factor":0.304,"rebaja":1244024},{"desde":8386681,"hasta":21665590,"factor":0.35,"rebaja":1629811},{"desde":21665591,"hasta":null,"factor":0.40,"rebaja":2713091}]'::jsonb
) ON CONFLICT (mes_vigencia) DO NOTHING;
