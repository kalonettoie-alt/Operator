-- Mise à jour du trigger pour sauvegarder les métadonnées (prénom, nom, téléphone)
-- transmises lors du signUp via options.data
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_existing_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_existing_profile
  FROM profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF FOUND THEN
    UPDATE profiles SET id = NEW.id WHERE email = NEW.email;
  ELSE
    INSERT INTO profiles (id, email, role, first_name, last_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      'client',
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone'
    );
  END IF;

  RETURN NEW;
END;
$$;
