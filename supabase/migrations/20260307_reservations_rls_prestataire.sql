-- Migration : accès lecture reservations pour les prestataires
-- Un prestataire peut voir une réservation si :
--   1. La réservation a un intervention_id qui lui est assigné
--   2. Son intervention a un reservation_id qui pointe vers cette réservation
--   3. La réservation concerne un logement sur lequel il a une mission

DROP POLICY IF EXISTS reservations_select_prestataire ON reservations;
CREATE POLICY reservations_select_prestataire ON reservations
  FOR SELECT USING (
    get_user_role() = 'prestataire' AND (
      -- Cas 1 : reservations.intervention_id pointe vers une de ses interventions
      intervention_id IN (
        SELECT id FROM interventions WHERE prestataire_id = auth.uid()
      )
      OR
      -- Cas 2 : une de ses interventions a reservation_id = cette réservation
      id IN (
        SELECT reservation_id FROM interventions
        WHERE prestataire_id = auth.uid() AND reservation_id IS NOT NULL
      )
      OR
      -- Cas 3 : même logement qu'une de ses interventions (fallback dates)
      logement_id IN (
        SELECT logement_id FROM interventions
        WHERE prestataire_id = auth.uid()
      )
    )
  );
