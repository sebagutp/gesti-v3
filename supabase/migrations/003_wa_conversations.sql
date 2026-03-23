-- ============================================================
-- HU-333: Tabla wa_conversations — Estado conversacional WhatsApp
-- ============================================================

CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  current_step TEXT NOT NULL DEFAULT 'menu',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode TEXT NOT NULL DEFAULT 'menu' CHECK (mode IN ('menu', 'simulacion', 'consulta')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda por teléfono (ya es UNIQUE, pero explícito)
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON wa_conversations (phone);

-- Índice para limpiar conversaciones expiradas
CREATE INDEX IF NOT EXISTS idx_wa_conversations_updated_at ON wa_conversations (updated_at);

-- RLS: solo acceso via service role (webhook API route)
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;

-- No se crean políticas RLS para usuarios autenticados ya que
-- esta tabla solo se accede desde el webhook con service_role key
