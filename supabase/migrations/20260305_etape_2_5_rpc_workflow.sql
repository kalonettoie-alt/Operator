-- ============================================================
-- ÉTAPE 2.5 — Fonctions RPC : Workflow prestataire + Admin
-- ============================================================
-- Ces fonctions utilisent SECURITY DEFINER pour contourner la RLS
-- et permettre aux prestataires d'effectuer des transitions de statut
-- sans avoir de droits UPDATE directs sur la table interventions.
-- ============================================================

-- ============================================================
-- 1. WORKFLOW PRESTATAIRE
-- ============================================================

-- Accepter une intervention
-- Prérequis : l'appelant EST le prestataire assigné, status = 'assignee'
CREATE OR REPLACE FUNCTION accepter_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Intervention non trouvée');
  END IF;
  IF v_intervention.prestataire_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  IF v_intervention.status != 'assignee' THEN
    RETURN json_build_object('success', false, 'error', 'Statut invalide');
  END IF;

  UPDATE interventions
    SET status = 'acceptee', updated_at = NOW()
    WHERE id = p_intervention_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Refuser une intervention
-- Prérequis : l'appelant EST le prestataire assigné, status = 'assignee'
-- Effet : remet l'intervention à 'a_attribuer' et ajoute le prestataire dans refused_by
CREATE OR REPLACE FUNCTION refuser_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Intervention non trouvée');
  END IF;
  IF v_intervention.prestataire_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  IF v_intervention.status != 'assignee' THEN
    RETURN json_build_object('success', false, 'error', 'Statut invalide');
  END IF;

  UPDATE interventions SET
    prestataire_id = NULL,
    status = 'a_attribuer',
    refused_by = array_append(COALESCE(refused_by, '{}'), v_user_id),
    updated_at = NOW()
  WHERE id = p_intervention_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Commencer une intervention
-- Prérequis : l'appelant EST le prestataire assigné, status = 'acceptee'
CREATE OR REPLACE FUNCTION commencer_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Intervention non trouvée');
  END IF;
  IF v_intervention.prestataire_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  IF v_intervention.status != 'acceptee' THEN
    RETURN json_build_object('success', false, 'error', 'Statut invalide');
  END IF;

  UPDATE interventions
    SET status = 'en_cours', started_at = NOW(), updated_at = NOW()
    WHERE id = p_intervention_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Terminer une intervention
-- Prérequis : l'appelant EST le prestataire assigné, status = 'en_cours'
CREATE OR REPLACE FUNCTION terminer_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Intervention non trouvée');
  END IF;
  IF v_intervention.prestataire_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  IF v_intervention.status != 'en_cours' THEN
    RETURN json_build_object('success', false, 'error', 'Statut invalide');
  END IF;

  UPDATE interventions
    SET status = 'terminee', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_intervention_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- 2. WORKFLOW ADMIN
-- ============================================================

-- Annuler une intervention (admin uniquement)
-- Prérequis : appelant = admin, status NOT IN ('terminee', 'annulee')
CREATE OR REPLACE FUNCTION annuler_intervention(p_intervention_id uuid, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
BEGIN
  -- Seul l'admin peut annuler
  IF get_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Intervention non trouvée');
  END IF;
  IF v_intervention.status IN ('terminee', 'annulee') THEN
    RETURN json_build_object('success', false, 'error', 'Statut invalide');
  END IF;

  UPDATE interventions SET
    status = 'annulee',
    cancellation_reason = p_reason,
    prestataire_id = NULL,
    updated_at = NOW()
  WHERE id = p_intervention_id;

  RETURN json_build_object('success', true);
END;
$$;
