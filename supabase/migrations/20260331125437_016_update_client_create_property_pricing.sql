-- Migration 016 : Mise à jour de la grille tarifaire + ajout laundry_enabled dans client_create_property
CREATE OR REPLACE FUNCTION client_create_property(
  p_address TEXT,
  p_city TEXT,
  p_postal_code TEXT,
  p_property_type property_type,
  p_offer_type offer_type,
  p_floor INTEGER DEFAULT NULL,
  p_has_elevator BOOLEAN DEFAULT FALSE,
  p_laundry_enabled BOOLEAN DEFAULT FALSE,
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
  v_base_price INTEGER;
  v_role user_role;
  v_laundry BOOLEAN;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'client' THEN
    RAISE EXCEPTION 'Unauthorized: client role required';
  END IF;

  -- City operator : blanchisserie toujours incluse
  v_laundry := CASE WHEN p_offer_type = 'city_operator' THEN TRUE ELSE p_laundry_enabled END;

  -- Prix en centimes selon grille tarifaire
  v_base_price := CASE p_offer_type
    WHEN 'operator' THEN (
      CASE p_property_type
        WHEN 'studio' THEN 2900
        WHEN 'T2'     THEN 3900
        WHEN 'T3'     THEN 4900
        WHEN 'T4+'    THEN 5900
      END
      + CASE WHEN p_laundry_enabled THEN
        CASE p_property_type
          WHEN 'studio' THEN 1400
          WHEN 'T2'     THEN 1600
          WHEN 'T3'     THEN 1800
          WHEN 'T4+'    THEN 2000
        END
      ELSE 0 END
    )
    WHEN 'city_operator' THEN (
      CASE p_property_type
        WHEN 'studio' THEN 5900
        WHEN 'T2'     THEN 6900
        WHEN 'T3'     THEN 7900
        WHEN 'T4+'    THEN 8900
      END
    )
  END;

  INSERT INTO properties (
    client_id, address, city, postal_code,
    property_type, offer_type, base_price,
    floor, has_elevator, laundry_enabled,
    specificities, photo_report_enabled,
    owner_reminder, latitude, longitude,
    is_active
  ) VALUES (
    auth.uid(), p_address, p_city, p_postal_code,
    p_property_type, p_offer_type, v_base_price,
    p_floor, p_has_elevator, v_laundry,
    p_specificities, p_photo_report_enabled,
    p_owner_reminder, p_latitude, p_longitude,
    TRUE
  )
  RETURNING id INTO v_property_id;

  RETURN v_property_id;
END;
$$;
