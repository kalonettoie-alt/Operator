-- =============================================================================
-- ÉTAPE 2.4 — Row Level Security (RLS) sur les 9 tables
-- À exécuter dans Supabase → SQL Editor
--
-- Ordre impératif :
--   1. Fonction get_user_role() (SECURITY DEFINER — évite la récursion infinie)
--   2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY (9 tables)
--   3. Policies (DROP IF EXISTS + CREATE pour idempotence)
--
-- ⚠️  Une fois ce script exécuté, le middleware utilise la clé anon + JWT.
--     La policy profiles_select_own (auth.uid() = id) permet au middleware
--     de lire le rôle de l'utilisateur connecté.
-- =============================================================================


-- =============================================================================
-- 0. Fonction utilitaire get_user_role()
--    SECURITY DEFINER : tourne en tant que postgres (bypass RLS sur profiles).
--    Sans ça, les policies appelleraient get_user_role() → SELECT profiles →
--    vérification RLS → appel get_user_role() → boucle infinie.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- =============================================================================
-- 1. Activation du RLS sur les 9 tables
-- =============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE logements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts   ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 2. Policies — PROFILES
--    Admin : voit tous les profils
--    Utilisateur : voit et modifie uniquement le sien
-- =============================================================================

DROP POLICY IF EXISTS profiles_select_admin ON profiles;
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_admin ON profiles;
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- =============================================================================
-- 3. Policies — LOGEMENTS
--    Admin : tout
--    Client : ses propres logements (client_id = son uid)
--    Prestataire : uniquement les logements de ses interventions assignées
-- =============================================================================

DROP POLICY IF EXISTS logements_admin_all ON logements;
CREATE POLICY logements_admin_all ON logements
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS logements_select_client ON logements;
CREATE POLICY logements_select_client ON logements
  FOR SELECT USING (
    get_user_role() = 'client' AND client_id = auth.uid()
  );

DROP POLICY IF EXISTS logements_select_prestataire ON logements;
CREATE POLICY logements_select_prestataire ON logements
  FOR SELECT USING (
    get_user_role() = 'prestataire' AND id IN (
      SELECT logement_id FROM interventions WHERE prestataire_id = auth.uid()
    )
  );


-- =============================================================================
-- 4. Policies — INTERVENTIONS
--    Admin : tout (lecture + écriture)
--    Client : uniquement les siennes en lecture (client_id = son uid)
--    Prestataire : uniquement les siennes en lecture (prestataire_id = son uid)
--    ⚠️  Le prestataire ne fait JAMAIS d'UPDATE direct → il passe par les RPC
--        (SECURITY DEFINER dans accepter_intervention, refuser_intervention, etc.)
-- =============================================================================

DROP POLICY IF EXISTS interventions_admin_all ON interventions;
CREATE POLICY interventions_admin_all ON interventions
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS interventions_select_client ON interventions;
CREATE POLICY interventions_select_client ON interventions
  FOR SELECT USING (
    get_user_role() = 'client' AND client_id = auth.uid()
  );

DROP POLICY IF EXISTS interventions_select_prestataire ON interventions;
CREATE POLICY interventions_select_prestataire ON interventions
  FOR SELECT USING (
    get_user_role() = 'prestataire' AND prestataire_id = auth.uid()
  );


-- =============================================================================
-- 5. Policies — RAPPORTS
--    Admin : tout
--    Prestataire : INSERT uniquement sur ses propres interventions + SELECT
--    Client : SELECT sur les rapports de ses propres interventions
-- =============================================================================

DROP POLICY IF EXISTS rapports_admin_all ON rapports;
CREATE POLICY rapports_admin_all ON rapports
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS rapports_insert_prestataire ON rapports;
CREATE POLICY rapports_insert_prestataire ON rapports
  FOR INSERT WITH CHECK (
    get_user_role() = 'prestataire' AND intervention_id IN (
      SELECT id FROM interventions WHERE prestataire_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rapports_select_client ON rapports;
CREATE POLICY rapports_select_client ON rapports
  FOR SELECT USING (
    get_user_role() = 'client' AND intervention_id IN (
      SELECT id FROM interventions WHERE client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rapports_select_prestataire ON rapports;
CREATE POLICY rapports_select_prestataire ON rapports
  FOR SELECT USING (
    get_user_role() = 'prestataire' AND intervention_id IN (
      SELECT id FROM interventions WHERE prestataire_id = auth.uid()
    )
  );


-- =============================================================================
-- 6. Policies — RESERVATION_SOURCES
--    Admin uniquement (les clients/prestataires n'accèdent pas aux sources iCal)
-- =============================================================================

DROP POLICY IF EXISTS reservation_sources_admin_all ON reservation_sources;
CREATE POLICY reservation_sources_admin_all ON reservation_sources
  FOR ALL USING (get_user_role() = 'admin');


-- =============================================================================
-- 7. Policies — RESERVATIONS
--    Admin : tout
--    Client : ses réservations (via ses logements)
-- =============================================================================

DROP POLICY IF EXISTS reservations_admin_all ON reservations;
CREATE POLICY reservations_admin_all ON reservations
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS reservations_select_client ON reservations;
CREATE POLICY reservations_select_client ON reservations
  FOR SELECT USING (
    get_user_role() = 'client' AND logement_id IN (
      SELECT id FROM logements WHERE client_id = auth.uid()
    )
  );


-- =============================================================================
-- 8. Policies — INVOICES
--    Admin : tout
--    Client : ses propres factures en lecture
-- =============================================================================

DROP POLICY IF EXISTS invoices_admin_all ON invoices;
CREATE POLICY invoices_admin_all ON invoices
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS invoices_select_client ON invoices;
CREATE POLICY invoices_select_client ON invoices
  FOR SELECT USING (
    get_user_role() = 'client' AND client_id = auth.uid()
  );


-- =============================================================================
-- 9. Policies — INVOICE_LINES
--    Admin : tout
--    Client : les lignes de ses propres factures
-- =============================================================================

DROP POLICY IF EXISTS invoice_lines_admin_all ON invoice_lines;
CREATE POLICY invoice_lines_admin_all ON invoice_lines
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS invoice_lines_select_client ON invoice_lines;
CREATE POLICY invoice_lines_select_client ON invoice_lines
  FOR SELECT USING (
    get_user_role() = 'client' AND invoice_id IN (
      SELECT id FROM invoices WHERE client_id = auth.uid()
    )
  );


-- =============================================================================
-- 10. Policies — PROVIDER_PAYOUTS
--     Admin : tout
--     Prestataire : ses propres récapitulatifs de paiement en lecture
-- =============================================================================

DROP POLICY IF EXISTS provider_payouts_admin_all ON provider_payouts;
CREATE POLICY provider_payouts_admin_all ON provider_payouts
  FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS provider_payouts_select_prestataire ON provider_payouts;
CREATE POLICY provider_payouts_select_prestataire ON provider_payouts
  FOR SELECT USING (
    get_user_role() = 'prestataire' AND prestataire_id = auth.uid()
  );


-- =============================================================================
-- VÉRIFICATION : liste toutes les policies créées
-- =============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd       AS operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
