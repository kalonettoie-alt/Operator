-- RPCs Prestataire

-- Accepter une mission
CREATE OR REPLACE FUNCTION provider_accept_mission(p_intervention_id UUID)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider' AND provider_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: active provider required';
  END IF;

  UPDATE interventions
  SET status = 'accepted', provider_id = auth.uid()
  WHERE id = p_intervention_id
    AND status = 'assigned'
    AND provider_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervention not found, not assigned to you, or already accepted';
  END IF;
END;
$$;

-- Refuser une mission
CREATE OR REPLACE FUNCTION provider_refuse_mission(
  p_intervention_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE interventions
  SET
    status = 'pending',
    provider_id = NULL,
    assigned_at = NULL,
    cancellation_reason = p_reason
  WHERE id = p_intervention_id
    AND provider_id = auth.uid()
    AND status IN ('assigned', 'accepted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervention not found or cannot be refused at this stage';
  END IF;
END;
$$;

-- Démarrer une mission (après photos avant)
CREATE OR REPLACE FUNCTION provider_start_mission(p_intervention_id UUID)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_photos_count INTEGER;
BEGIN
  -- Vérifier qu'il y a au moins 2 photos avant
  SELECT COUNT(*) INTO v_photos_count
  FROM intervention_photos
  WHERE intervention_id = p_intervention_id AND type = 'before';

  IF v_photos_count < 2 THEN
    RAISE EXCEPTION 'At least 2 before-photos required to start the mission';
  END IF;

  UPDATE interventions
  SET status = 'in_progress', started_at = NOW()
  WHERE id = p_intervention_id
    AND provider_id = auth.uid()
    AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervention not found or not in accepted status';
  END IF;
END;
$$;

-- Cocher/décocher un item checklist
CREATE OR REPLACE FUNCTION provider_update_checklist(
  p_intervention_id UUID,
  p_item_id TEXT,
  p_checked BOOLEAN
)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE interventions
  SET checklist = (
    SELECT jsonb_agg(
      CASE
        WHEN item->>'id' = p_item_id
          THEN jsonb_set(item, '{checked}', to_jsonb(p_checked))
        ELSE item
      END
    )
    FROM jsonb_array_elements(checklist) AS item
  )
  WHERE id = p_intervention_id
    AND provider_id = auth.uid()
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervention not found or not in progress';
  END IF;
END;
$$;

-- Terminer une intervention (BN-07)
CREATE OR REPLACE FUNCTION provider_complete_intervention(p_intervention_id UUID)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_checklist JSONB;
  v_unchecked INTEGER;
  v_photos_after INTEGER;
BEGIN
  SELECT checklist INTO v_checklist
  FROM interventions
  WHERE id = p_intervention_id AND provider_id = auth.uid() AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervention not found or not in progress';
  END IF;

  -- Vérifier checklist complète
  SELECT COUNT(*) INTO v_unchecked
  FROM jsonb_array_elements(v_checklist) AS item
  WHERE (item->>'required')::BOOLEAN = TRUE
    AND (item->>'checked')::BOOLEAN = FALSE;

  IF v_unchecked > 0 THEN
    RAISE EXCEPTION 'Checklist incomplete: % required items remaining', v_unchecked;
  END IF;

  -- Vérifier photos après
  SELECT COUNT(*) INTO v_photos_after
  FROM intervention_photos
  WHERE intervention_id = p_intervention_id AND type = 'after';

  IF v_photos_after < 2 THEN
    RAISE EXCEPTION 'At least 2 after-photos required to complete the mission';
  END IF;

  UPDATE interventions
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_intervention_id;
END;
$$;
