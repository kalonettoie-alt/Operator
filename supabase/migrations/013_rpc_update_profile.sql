-- RPC : mise à jour du profil client (inscription steps 2-3)
CREATE OR REPLACE FUNCTION client_update_profile(
  p_first_name TEXT DEFAULT NULL,
  p_last_name  TEXT DEFAULT NULL,
  p_phone      TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name  = COALESCE(p_last_name,  last_name),
    phone      = COALESCE(p_phone,      phone)
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_update_profile TO authenticated;
