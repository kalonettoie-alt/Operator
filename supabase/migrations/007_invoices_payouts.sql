-- Statuts factures et paiements
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'pending_payment', 'paid', 'failed');
CREATE TYPE payout_status AS ENUM ('pending', 'ready_to_transfer', 'validated', 'paid', 'failed');

-- Éviter les doublons de génération de factures (MF-11)
CREATE TABLE invoice_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key TEXT NOT NULL UNIQUE,   -- ex: '2026-03-16' ou '2026-04-01'
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  invoices_created INTEGER DEFAULT 0
);

-- Séquence pour la numérotation des factures
CREATE SEQUENCE invoice_number_seq START 1;

-- Factures clients
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  invoice_number TEXT NOT NULL UNIQUE,  -- PRO-2026-03-001
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,         -- Provision prestataires
  management_fee NUMERIC(10,2) DEFAULT 0, -- Frais de gestion
  total NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,4) DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  sepa_payment_intent_id TEXT,
  sepa_batch_id TEXT,
  html_content TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their invoices"
  ON invoices FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Admins can read all invoices"
  ON invoices FOR SELECT USING (is_admin());

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Payouts prestataires
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status payout_status DEFAULT 'pending',
  stripe_transfer_id TEXT,
  sepa_batch_id TEXT,
  intervention_ids UUID[] DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can read their payouts"
  ON payouts FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Admins can read all payouts"
  ON payouts FOR SELECT USING (is_admin());

CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Idempotence webhooks Stripe (SE-02)
CREATE TABLE processed_stripe_events (
  id TEXT PRIMARY KEY,  -- Stripe event ID
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
