-- Migration 018 : Suppression du check SEPA dans client_add_ical_source
-- L'iCal est une fonctionnalité de base, pas liée à la facturation
CREATE OR REPLACE FUNCTION client_add_ical_source(
  p_property_id UUID,
  p_url TEXT,
  p_platform TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_source_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id AND client_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Property not found or unauthorized';
  END IF;

  INSERT INTO ical_sources (property_id, url, platform)
  VALUES (p_property_id, p_url, p_platform)
  RETURNING id INTO v_source_id;

  RETURN v_source_id;
END;
$$;
