-- RPCs Client — toutes les mutations passent par ces fonctions SECURITY DEFINER

-- Créer un logement
CREATE OR REPLACE FUNCTION client_create_property(
  p_address TEXT,
  p_city TEXT,
  p_postal_code TEXT,
  p_property_type property_type,
  p_offer_type offer_type,
  p_floor INTEGER DEFAULT NULL,
  p_has_elevator BOOLEAN DEFAULT FALSE,
  p_specificities TEXT[] DEFAULT '{}',
  p_photo_report_enabled BOOLEAN DEFAULT TRUE,
  p_owner_reminder TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_property_id UUID;
  v_base_price NUMERIC(10,2);
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'client' THEN
    RAISE EXCEPTION 'Unauthorized: client role required';
  END IF;

  -- Prix selon type + offre (grille tarifaire)
  v_base_price := CASE
    WHEN p_offer_type = 'operator' THEN
      CASE p_property_type
        WHEN 'studio' THEN 45
        WHEN 'T2' THEN 55
        WHEN 'T3' THEN 65
        WHEN 'T4+' THEN 80
      END
    WHEN p_offer_type = 'city_operator' THEN
      CASE p_property_type
        WHEN 'studio' THEN 35
        WHEN 'T2' THEN 45
        WHEN 'T3' THEN 55
        WHEN 'T4+' THEN 70
      END
  END;

  -- Contrainte blanchisserie (IA-07)
  IF p_offer_type = 'city_operator' THEN
    -- laundry_enabled reste FALSE par défaut
    NULL;
  END IF;

  INSERT INTO properties (
    client_id, address, city, postal_code,
    property_type, offer_type, floor, has_elevator,
    specificities, photo_report_enabled, owner_reminder,
    base_price, latitude, longitude
  ) VALUES (
    auth.uid(), p_address, p_city, p_postal_code,
    p_property_type, p_offer_type, p_floor, p_has_elevator,
    p_specificities, p_photo_report_enabled, p_owner_reminder,
    v_base_price, p_latitude, p_longitude
  )
  RETURNING id INTO v_property_id;

  RETURN v_property_id;
END;
$$;

-- Ajouter une source iCal
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
  -- Vérifier que le logement appartient au client
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id AND client_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Property not found or unauthorized';
  END IF;

  -- Bloquer si pas de SEPA actif
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND sepa_mandate_active = TRUE
  ) THEN
    RAISE EXCEPTION 'SEPA mandate required to activate iCal sync';
  END IF;

  INSERT INTO ical_sources (property_id, url, platform)
  VALUES (p_property_id, p_url, p_platform)
  RETURNING id INTO v_source_id;

  RETURN v_source_id;
END;
$$;
