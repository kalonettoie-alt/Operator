-- ============================================================
-- ÉTAPE 10.4 — Cron automatique pg_cron : sync iCal toutes les 30 min
-- ============================================================
--
-- PRÉREQUIS : activer l'extension pg_net dans Supabase
-- Dashboard → Database → Extensions → "pg_net" → Enable
--
-- INSTRUCTIONS AVANT D'EXÉCUTER :
-- 1. Remplacer 'https://TON_APP.vercel.app' par l'URL réelle de l'app Vercel
-- 2. Remplacer 'TON_CRON_SECRET' par la valeur exacte de la variable
--    d'environnement CRON_SECRET définie dans Vercel
-- 3. Exécuter ce script dans Supabase → SQL Editor
--
-- VÉRIFICATION APRÈS EXÉCUTION :
--   SELECT * FROM cron.job;               -- liste les jobs planifiés
--   SELECT * FROM cron.job_run_details    -- historique des exécutions
--     ORDER BY start_time DESC LIMIT 10;
-- ============================================================

-- 1. Activer pg_net (HTTP calls depuis pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Supprimer le job si déjà existant (idempotent)
SELECT cron.unschedule('sync-ical-every-30min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-ical-every-30min'
);

-- 3. Planifier la sync toutes les 30 minutes
SELECT cron.schedule(
  'sync-ical-every-30min',   -- nom du job (unique)
  '*/30 * * * *',            -- cron expression : toutes les 30 min
  $$
    SELECT net.http_post(
      url     := 'https://TON_APP.vercel.app/api/cron/sync-ical',
      headers := '{"Authorization": "Bearer TON_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);
