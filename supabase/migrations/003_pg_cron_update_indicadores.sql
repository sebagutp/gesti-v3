-- ============================================================
-- HU-302: pg_cron — Actualización mensual de indicadores
-- Sprint 3, Rama A
--
-- Configura pg_cron para invocar la Edge Function
-- update-indicadores el día 1 de cada mes a las 08:00 UTC.
-- ============================================================

-- Habilitar extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Habilitar extensión pg_net para HTTP requests desde PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Eliminar job anterior si existe (idempotente)
SELECT cron.unschedule('update-indicadores-mensual')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-indicadores-mensual'
);

-- Crear cron job: día 1 de cada mes a las 08:00 UTC
-- Invoca la Edge Function update-indicadores via pg_net
SELECT cron.schedule(
  'update-indicadores-mensual',    -- nombre del job
  '0 8 1 * *',                     -- cron: minuto 0, hora 8, día 1, todos los meses
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/update-indicadores',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"trigger": "pg_cron"}'::jsonb
  );
  $$
);

-- Verificación: SELECT * FROM cron.job WHERE jobname = 'update-indicadores-mensual';
-- Debe mostrar: schedule = '0 8 1 * *', active = true
