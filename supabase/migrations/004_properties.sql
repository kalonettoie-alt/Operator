-- Logements des clients
CREATE TYPE property_type AS ENUM ('studio', 'T2', 'T3', 'T4+');
CREATE TYPE offer_type AS ENUM ('operator', 'city_operator');

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  internal_name TEXT,             -- Auto-généré (BN-02)
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  property_type property_type NOT NULL,
  offer_type offer_type NOT NULL,
  floor INTEGER,
  has_elevator BOOLEAN DEFAULT FALSE,
  specificities TEXT[] DEFAULT '{}', -- ['balcon', 'terrasse', 'cave', etc.]
  access_code_encrypted TEXT,     -- Chiffré AES-256-GCM côté Edge Function
  wifi_code_encrypted TEXT,       -- Chiffré AES-256-GCM côté Edge Function
  owner_reminder TEXT,
  photo_report_enabled BOOLEAN DEFAULT TRUE,
  laundry_enabled BOOLEAN DEFAULT FALSE,
  guest_link_enabled BOOLEAN DEFAULT FALSE,
  base_price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their own properties"
  ON properties FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Admins can read all properties"
  ON properties FOR SELECT
  USING (is_admin());

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger : générer le nom interne automatiquement (BN-02)
CREATE OR REPLACE FUNCTION generate_internal_name()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_base TEXT;
  v_count INTEGER;
BEGIN
  v_base := NEW.property_type::TEXT || ' / ' || NEW.city;

  SELECT COUNT(*) INTO v_count
  FROM properties
  WHERE client_id = NEW.client_id
    AND internal_name LIKE v_base || '%'
    AND id != NEW.id;

  IF v_count = 0 THEN
    NEW.internal_name := v_base;
  ELSE
    NEW.internal_name := v_base || ' #' || (v_count + 1)::TEXT;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER properties_generate_name
  BEFORE INSERT ON properties
  FOR EACH ROW
  WHEN (NEW.internal_name IS NULL)
  EXECUTE FUNCTION generate_internal_name();
