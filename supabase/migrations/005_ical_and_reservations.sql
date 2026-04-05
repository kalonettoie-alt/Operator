-- Sources iCal des logements
CREATE TABLE ical_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform TEXT,                  -- 'airbnb', 'booking', 'autre'
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ical_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their ical sources"
  ON ical_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = ical_sources.property_id AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all ical sources"
  ON ical_sources FOR SELECT USING (is_admin());

-- Réservations (issues du parsing iCal)
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  ical_source_id UUID REFERENCES ical_sources(id),
  ical_uid TEXT NOT NULL,          -- UID unique de l'événement iCal
  guest_name TEXT,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  platform TEXT,
  guest_token UUID DEFAULT gen_random_uuid(),  -- Token voyageur (SE-01)
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(property_id, ical_uid)    -- Protection doublons (MF-11)
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = reservations.property_id AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all reservations"
  ON reservations FOR SELECT USING (is_admin());

CREATE POLICY "Anon can read reservation by guest_token"
  ON reservations FOR SELECT
  USING (TRUE);  -- Filtré par token dans la Edge Function

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
