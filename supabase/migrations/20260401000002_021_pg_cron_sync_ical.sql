-- Migration 021 : Cron sync-ical toutes les 15 minutes
-- Prérequis : définir app.cron_secret dans les settings Postgres
-- ET configurer CRON_SECRET comme secret de l'Edge Function sync-ical

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'sync-ical-15min',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ytwauorqnbdilbusqtla.supabase.co/functions/v1/sync-ical',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'
  );
  $$
);
