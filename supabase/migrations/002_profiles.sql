-- Table principale des utilisateurs (clients, prestataires, admins)
CREATE TYPE user_role AS ENUM ('client', 'provider', 'admin');
CREATE TYPE provider_status AS ENUM ('pending', 'active', 'suspended');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Client fields
  sepa_customer_id TEXT,          -- Stripe Customer ID
  sepa_mandate_active BOOLEAN DEFAULT FALSE,

  -- Provider fields
  provider_status provider_status DEFAULT NULL,
  stripe_account_id TEXT,         -- Stripe Connect Account ID
  siret TEXT,
  company_name TEXT,
  is_auto_entrepreneur BOOLEAN DEFAULT FALSE,
  certification_score INTEGER,
  certification_passed BOOLEAN DEFAULT FALSE,
  kit_validated BOOLEAN DEFAULT FALSE,
  formation_paid BOOLEAN DEFAULT FALSE,
  zones TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT NULL,
  rating_count INTEGER DEFAULT 0,
  monthly_target NUMERIC(10,2) DEFAULT 2000,
  notification_token TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
