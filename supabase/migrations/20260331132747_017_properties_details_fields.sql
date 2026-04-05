-- Migration 017 : Ajout des champs détaillés sur les logements (accès, capacité, équipements, horaires, rapport)

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS has_key_box BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS key_box_code_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS has_spare_keys BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS double_beds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS single_beds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sofa_beds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS baby_beds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balcony BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS jacuzzi BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS checkout_time TEXT DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS report_extras TEXT[] DEFAULT '{}';

-- Mise à jour de client_create_property avec tous les nouveaux paramètres
CREATE OR REPLACE FUNCTION client_create_property(
  p_address TEXT,
  p_city TEXT,
  p_postal_code TEXT,
  p_property_type property_type,
  p_offer_type offer_type,
  p_floor INTEGER DEFAULT NULL,
  p_has_elevator BOOLEAN DEFAULT FALSE,
  p_has_key_box BOOLEAN DEFAULT FALSE,
  p_key_box_code TEXT DEFAULT NULL,
  p_has_spare_keys BOOLEAN DEFAULT FALSE,
  p_access_code TEXT DEFAULT NULL,
  p_wifi_code TEXT DEFAULT NULL,
  p_owner_reminder TEXT DEFAULT NULL,
  p_laundry_enabled BOOLEAN DEFAULT FALSE,
  p_double_beds INTEGER DEFAULT 0,
  p_single_beds INTEGER DEFAULT 0,
  p_sofa_beds INTEGER DEFAULT 0,
  p_baby_beds INTEGER DEFAULT 0,
  p_balcony BOOLEAN DEFAULT FALSE,
  p_parking BOOLEAN DEFAULT FALSE,
  p_pets_allowed BOOLEAN DEFAULT FALSE,
  p_jacuzzi BOOLEAN DEFAULT FALSE,
  p_checkin_time TEXT DEFAULT '16:00',
  p_checkout_time TEXT DEFAULT '10:00',
  p_photo_report_enabled BOOLEAN DEFAULT TRUE,
  p_report_extras TEXT[] DEFAULT '{}',
  p_guest_link_enabled BOOLEAN DEFAULT FALSE,
  p_specificities TEXT[] DEFAULT '{}',
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_property_id UUID;
  v_base_price INTEGER;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'client' THEN
    RAISE EXCEPTION 'Unauthorized: client role required';
  END IF;

  -- Prix en centimes (grille tarifaire Phase 2)
  v_base_price := CASE p_offer_type
    WHEN 'operator' THEN (
      CASE p_property_type
        WHEN 'studio' THEN 2900 WHEN 'T2' THEN 3900
        WHEN 'T3' THEN 4900 WHEN 'T4+' THEN 5900
      END
      + CASE WHEN p_laundry_enabled THEN
        CASE p_property_type
          WHEN 'studio' THEN 1400 WHEN 'T2' THEN 1600
          WHEN 'T3' THEN 1800 WHEN 'T4+' THEN 2000
        END ELSE 0 END
    )
    WHEN 'city_operator' THEN (
      CASE p_property_type
        WHEN 'studio' THEN 5900 WHEN 'T2' THEN 6900
        WHEN 'T3' THEN 7900 WHEN 'T4+' THEN 8900
      END
    )
  END;

  INSERT INTO properties (
    client_id, address, city, postal_code,
    property_type, offer_type, base_price,
    floor, has_elevator,
    has_key_box, key_box_code_encrypted, has_spare_keys,
    access_code_encrypted, wifi_code_encrypted, owner_reminder,
    laundry_enabled,
    double_beds, single_beds, sofa_beds, baby_beds,
    balcony, parking, pets_allowed, jacuzzi,
    checkin_time, checkout_time,
    photo_report_enabled, report_extras, guest_link_enabled,
    specificities, latitude, longitude, is_active
  ) VALUES (
    auth.uid(), p_address, p_city, p_postal_code,
    p_property_type, p_offer_type, v_base_price,
    p_floor, p_has_elevator,
    p_has_key_box, p_key_box_code, p_has_spare_keys,
    p_access_code, p_wifi_code, p_owner_reminder,
    p_laundry_enabled,
    p_double_beds, p_single_beds, p_sofa_beds, p_baby_beds,
    p_balcony, p_parking, p_pets_allowed, p_jacuzzi,
    p_checkin_time, p_checkout_time,
    p_photo_report_enabled, p_report_extras, p_guest_link_enabled,
    p_specificities, p_latitude, p_longitude,
    TRUE
  )
  RETURNING id INTO v_property_id;

  RETURN v_property_id;
END;
$$;
