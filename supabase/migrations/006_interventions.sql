-- Statuts interventions
CREATE TYPE intervention_status AS ENUM (
  'pending', 'assigned', 'accepted', 'in_progress',
  'completed', 'cancelled', 'disputed'
);

-- Interventions
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  reservation_id UUID REFERENCES reservations(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  provider_id UUID REFERENCES profiles(id),
  status intervention_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL DEFAULT '11:00',
  price NUMERIC(10,2) NOT NULL,
  provider_payout NUMERIC(10,2) NOT NULL,
  deltom_commission NUMERIC(10,2) NOT NULL,
  checklist JSONB DEFAULT '[]',
  owner_reminder TEXT,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  early_checkin_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their interventions"
  ON interventions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Providers can read assigned interventions"
  ON interventions FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can read all interventions"
  ON interventions FOR SELECT USING (is_admin());

CREATE TRIGGER interventions_updated_at
  BEFORE UPDATE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Photos d'intervention
CREATE TABLE intervention_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('before', 'after', 'specific', 'damage')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE intervention_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their intervention photos"
  ON intervention_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_photos.intervention_id AND i.client_id = auth.uid()
    )
  );

CREATE POLICY "Providers can read their intervention photos"
  ON intervention_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_photos.intervention_id AND i.provider_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all photos"
  ON intervention_photos FOR SELECT USING (is_admin());
