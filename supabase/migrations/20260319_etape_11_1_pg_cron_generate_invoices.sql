-- ============================================================
-- ÉTAPE 11.1 — Cron automatique pg_cron : génération des factures
-- ============================================================
--
-- PRÉREQUIS : extension pg_net activée (voir étape 10.4)
-- Dashboard → Database → Extensions → "pg_net" → Enable
--
-- INSTRUCTIONS AVANT D'EXÉCUTER :
-- 1. Remplacer 'https://TON_APP.vercel.app' par l'URL réelle de l'app Vercel
-- 2. Remplacer 'TON_CRON_SECRET' par la valeur exacte de la variable
--    d'environnement CRON_SECRET définie dans Vercel
-- 3. Exécuter ce script dans Supabase → SQL Editor
--
-- RÈGLE DE PÉRIODE :
--   Le 1er  du mois → facture la période du 16 au dernier jour du mois précédent
--   Le 16   du mois → facture la période du 1er au 15 du mois en cours
--
-- VÉRIFICATION APRÈS EXÉCUTION :
--   SELECT * FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- ============================================================

-- 1. Activer pg_net si pas encore fait
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Supprimer les jobs si déjà existants (idempotent)
SELECT cron.unschedule('generate-invoices-1er')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-invoices-1er'
);

SELECT cron.unschedule('generate-invoices-16')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-invoices-16'
);

-- 3. Job du 1er du mois à 06h00 UTC
--    → génère les factures pour la période 16–fin du mois précédent
SELECT cron.schedule(
  'generate-invoices-1er',   -- nom du job (unique)
  '0 6 1 * *',               -- cron expression : le 1er de chaque mois à 06h00 UTC
  $$
    SELECT net.http_post(
      url     := 'https://TON_APP.vercel.app/api/cron/generate-invoices',
      headers := '{"Authorization": "Bearer TON_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);

-- 4. Job du 16 du mois à 06h00 UTC
--    → génère les factures pour la période 1–15 du mois en cours
SELECT cron.schedule(
  'generate-invoices-16',    -- nom du job (unique)
  '0 6 16 * *',              -- cron expression : le 16 de chaque mois à 06h00 UTC
  $$
    SELECT net.http_post(
      url     := 'https://TON_APP.vercel.app/api/cron/generate-invoices',
      headers := '{"Authorization": "Bearer TON_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    )
  $$
);
