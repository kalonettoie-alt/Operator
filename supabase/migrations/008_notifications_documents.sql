-- Tokens de notification push
CREATE TABLE notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tokens"
  ON notification_tokens FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER notification_tokens_updated_at
  BEFORE UPDATE ON notification_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Documents prestataires
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE document_type AS ENUM ('id', 'kbis', 'insurance', 'rib', 'other');

CREATE TABLE provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  storage_path TEXT NOT NULL,     -- Chemin dans le bucket privé
  status document_status DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can read their documents"
  ON provider_documents FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Admins can read all documents"
  ON provider_documents FOR ALL USING (is_admin());

-- Early check-in
CREATE TYPE early_checkin_status AS ENUM ('requested', 'approved', 'paid', 'refused', 'expired');

CREATE TABLE early_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  requested_hours INTEGER NOT NULL CHECK (requested_hours BETWEEN 1 AND 4),
  price NUMERIC(10,2) NOT NULL,
  status early_checkin_status DEFAULT 'requested',
  stripe_checkout_id TEXT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE early_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage early checkins"
  ON early_checkins FOR ALL USING (is_admin());

CREATE POLICY "Anyone can read by intervention"
  ON early_checkins FOR SELECT USING (TRUE);

-- Avis voyageurs
CREATE TABLE guest_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id),
  provider_id UUID NOT NULL REFERENCES profiles(id),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guest_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a review"
  ON guest_reviews FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Providers can read their reviews"
  ON guest_reviews FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Admins can read all reviews"
  ON guest_reviews FOR SELECT USING (is_admin());

-- Trigger : mettre à jour la note moyenne du prestataire
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET
    rating = (
      SELECT AVG(rating)::NUMERIC(3,2) FROM guest_reviews
      WHERE provider_id = NEW.provider_id
    ),
    rating_count = (
      SELECT COUNT(*) FROM guest_reviews
      WHERE provider_id = NEW.provider_id
    )
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
  AFTER INSERT ON guest_reviews
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();
