-- Correction boucle infinie dans la policy RLS des admins
-- L'ancienne policy faisait une sous-requête sur profiles depuis une policy de profiles
-- → infinite recursion (code 42P17)
-- Fix : utiliser is_admin() qui est SECURITY DEFINER (bypass RLS, pas de récursion)

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_admin());
