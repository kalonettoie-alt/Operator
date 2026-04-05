-- Trigger : créer un profil à chaque inscription (BC-01)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_role user_role;
  v_existing_profile profiles%ROWTYPE;
BEGIN
  -- Chercher un profil existant avec cet email (prestataire pré-créé par l'admin)
  SELECT * INTO v_existing_profile
  FROM profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF FOUND THEN
    -- Lier le compte Auth au profil existant
    UPDATE profiles SET id = NEW.id WHERE email = NEW.email;
  ELSE
    -- Nouveau client par défaut
    INSERT INTO profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'client');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Hook JWT : ajouter le rôle dans le token (Phase 1)
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_role user_role;
  claims JSONB;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::TEXT));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Utilitaire : vérifier si l'utilisateur courant est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Utilitaire : récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS user_role
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

-- Autoriser le hook JWT à être appelé par supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT SELECT ON public.profiles TO supabase_auth_admin;
