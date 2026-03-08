-- ============================================================
-- ÉTAPE 5.4 — Rapport de fin d'intervention
-- ============================================================
-- Objectif : enrichir la RPC terminer_intervention pour qu'elle
--   1. Crée le rapport (photos, checklist, dégâts)
--   2. Marque l'intervention terminée (status = 'terminee', completed_at = now())
--
-- IMPORTANT : exécuter ce fichier APRÈS la migration 20260305_etape_2_5.
-- ============================================================

-- ─── Contrainte UNIQUE sur rapports.intervention_id ────────────────────────
-- Garantit la relation 1-to-1 entre intervention et rapport.
-- ON CONFLICT (intervention_id) dans la RPC en dépend.
ALTER TABLE rapports
  DROP CONSTRAINT IF EXISTS rapports_intervention_id_key;
ALTER TABLE rapports
  ADD CONSTRAINT rapports_intervention_id_key UNIQUE (intervention_id);

-- ─── RPC : terminer_intervention (version enrichie) ────────────────────────
--
-- Paramètres :
--   p_intervention_id     uuid        — identifiant de l'intervention
--   p_photos_intervention text[]      — URLs des photos prises pendant l'intervention
--   p_taches_effectuees   jsonb       — checklist { label, done }[]
--   p_degats_signales     boolean     — y a-t-il des dégâts ?
--   p_degats_description  text        — description des dégâts (si degats_signales = true)
--   p_degats_photos       text[]      — photos des dégâts (optionnel)
--
-- Effets :
--   • INSERT ou UPDATE dans rapports (upsert via ON CONFLICT)
--   • UPDATE interventions SET status = 'terminee', completed_at = now()
--
-- Sécurité : SECURITY DEFINER → contourne la RLS (nécessaire pour écrire
--   dans rapports depuis un prestataire).

CREATE OR REPLACE FUNCTION terminer_intervention(
  p_intervention_id     uuid,
  p_photos_intervention text[]  DEFAULT NULL,
  p_taches_effectuees   jsonb   DEFAULT NULL,
  p_degats_signales     boolean DEFAULT false,
  p_degats_description  text    DEFAULT NULL,
  p_degats_photos       text[]  DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id      uuid := auth.uid();
BEGIN
  -- 1. Récupérer l'intervention
  SELECT * INTO v_intervention
    FROM interventions
   WHERE id = p_intervention_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Intervention non trouvée');
  END IF;

  -- 2. Vérifier que l'appelant est bien le prestataire assigné
  IF v_intervention.prestataire_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  -- 3. Vérifier le statut
  IF v_intervention.status != 'en_cours' THEN
    RETURN json_build_object('success', false, 'error', 'Statut invalide : l''intervention doit être en cours');
  END IF;

  -- 4. Créer ou mettre à jour le rapport (upsert)
  INSERT INTO rapports (
    intervention_id,
    photos_intervention,
    taches_effectuees,
    degats_signales,
    degats_description,
    degats_photos
  ) VALUES (
    p_intervention_id,
    p_photos_intervention,
    p_taches_effectuees,
    COALESCE(p_degats_signales, false),
    p_degats_description,
    p_degats_photos
  )
  ON CONFLICT (intervention_id) DO UPDATE SET
    photos_intervention = EXCLUDED.photos_intervention,
    taches_effectuees   = EXCLUDED.taches_effectuees,
    degats_signales     = EXCLUDED.degats_signales,
    degats_description  = EXCLUDED.degats_description,
    degats_photos       = EXCLUDED.degats_photos;

  -- 5. Terminer l'intervention
  UPDATE interventions
     SET status       = 'terminee',
         completed_at = now(),
         updated_at   = now()
   WHERE id = p_intervention_id;

  RETURN json_build_object('success', true);
END;
$$;
