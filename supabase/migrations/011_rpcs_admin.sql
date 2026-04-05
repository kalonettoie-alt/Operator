-- RPCs Admin — toutes protégées par IF NOT is_admin()

-- Assigner un prestataire à une intervention (BC-04, MF-02)
CREATE OR REPLACE FUNCTION admin_assign_provider(
  p_intervention_id UUID,
  p_provider_id UUID
)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE interventions
  SET
    provider_id = p_provider_id,
    status = 'assigned',
    assigned_at = NOW()
  WHERE id = p_intervention_id
    AND status IN ('pending', 'assigned');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervention not found or cannot be assigned at this stage';
  END IF;
END;
$$;

-- Valider un document prestataire (BC-04, BC-05)
CREATE OR REPLACE FUNCTION admin_validate_document(
  p_document_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE provider_documents
  SET
    status = CASE WHEN p_approved THEN 'approved'::document_status ELSE 'rejected'::document_status END,
    rejection_reason = p_rejection_reason,
    reviewed_at = NOW(),
    reviewed_by = auth.uid()
  WHERE id = p_document_id
  RETURNING provider_id INTO v_provider_id;

  -- Vérifier si le prestataire remplit les 3 conditions d'activation (BC-05)
  PERFORM check_provider_activation(v_provider_id);
END;
$$;

-- Vérifier et activer un prestataire si toutes les conditions sont remplies (BC-05)
CREATE OR REPLACE FUNCTION check_provider_activation(p_provider_id UUID)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_docs_ok BOOLEAN;
  v_certif_ok BOOLEAN;
  v_kit_ok BOOLEAN;
BEGIN
  SELECT
    (NOT EXISTS (
      SELECT 1 FROM provider_documents
      WHERE provider_id = p_provider_id AND status != 'approved'
    ) AND EXISTS (
      SELECT 1 FROM provider_documents WHERE provider_id = p_provider_id
    )),
    certification_passed,
    kit_validated
  INTO v_docs_ok, v_certif_ok, v_kit_ok
  FROM profiles WHERE id = p_provider_id;

  IF v_docs_ok AND v_certif_ok AND v_kit_ok THEN
    UPDATE profiles
    SET provider_status = 'active'
    WHERE id = p_provider_id AND provider_status = 'pending';
  END IF;
END;
$$;

-- Valider un payout prestataire (AG-04)
CREATE OR REPLACE FUNCTION admin_validate_payout(p_payout_id UUID)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE payouts
  SET status = 'validated'
  WHERE id = p_payout_id AND status = 'ready_to_transfer';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found or not in ready_to_transfer status';
  END IF;
END;
$$;
