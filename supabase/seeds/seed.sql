-- Seed data pour les tests et démonstrations
-- À exécuter après les migrations

-- Note: Les mots de passe sont gérés par Supabase Auth.
-- Pour créer des comptes de test, utiliser l'API Auth ou le dashboard Supabase.

-- Insérer un admin directement (à faire manuellement après création du compte Auth)
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@deltom.fr';

-- Données de démonstration (commentées par défaut)
-- DO $$
-- DECLARE
--   v_client_id UUID := gen_random_uuid();
--   v_provider_id UUID := gen_random_uuid();
--   v_property_id UUID;
-- BEGIN
--   -- Client de démo
--   INSERT INTO profiles (id, email, role, first_name, last_name, phone, sepa_mandate_active)
--   VALUES (v_client_id, 'client@demo.fr', 'client', 'Marie', 'Dupont', '+33600000001', TRUE);
--
--   -- Prestataire de démo
--   INSERT INTO profiles (id, email, role, first_name, last_name, phone, provider_status, certification_passed, kit_validated, formation_paid)
--   VALUES (v_provider_id, 'provider@demo.fr', 'provider', 'Jean', 'Martin', '+33600000002', 'active', TRUE, TRUE, TRUE);
--
--   -- Logement de démo
--   INSERT INTO properties (client_id, address, city, postal_code, property_type, offer_type, base_price)
--   VALUES (v_client_id, '10 rue de Rivoli', 'Paris', '75001', 'T2', 'operator', 55)
--   RETURNING id INTO v_property_id;
--
-- END $$;

SELECT 'Seed OK — utiliser le dashboard Supabase pour créer les comptes Auth de test.' AS message;
