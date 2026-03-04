-- =============================================================================
-- ÉTAPE 2.3 — Création des 5 nouvelles tables V3
-- À exécuter dans Supabase → SQL Editor
--
-- Ordre impératif (FK dependencies) :
--   1. reservation_sources  (FK → logements)
--   2. reservations         (FK → logements, reservation_sources)
--   3. ALTER interventions  (ajouter FK reservation_id → reservations)
--   4. invoices             (FK → profiles)
--   5. invoice_lines        (FK → invoices ON DELETE CASCADE, interventions, logements)
--   6. provider_payouts     (FK → profiles)
-- =============================================================================


-- ─── Pré-requis : fonction update_updated_at (si pas encore créée) ──────────
-- Elle est normalement créée à l'étape 1.1 ; cette clause la recrée si absente.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 3.5  reservation_sources
-- Paramètres de synchronisation iCal/webhook pour chaque logement.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reservation_sources (
  id                     uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  logement_id            uuid        NOT NULL REFERENCES logements(id),
  type                   text        NOT NULL CHECK (type IN ('ical', 'webhook')),
  platform               text        NOT NULL CHECK (platform IN ('airbnb', 'booking', 'hospitable', 'guesty', 'other')),
  ical_url               text,
  webhook_secret         text,
  sync_interval_minutes  integer     DEFAULT 30,
  last_synced_at         timestamptz,
  is_active              boolean     DEFAULT true,
  created_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_sources_logement_id ON reservation_sources(logement_id);


-- =============================================================================
-- 3.6  reservations
-- Réservations importées depuis Airbnb, Booking, etc.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reservations (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  logement_id  uuid        NOT NULL REFERENCES logements(id),
  source_id    uuid        REFERENCES reservation_sources(id),
  external_id  text,                    -- ID Airbnb/Booking pour dédoublonnage
  platform     text        NOT NULL CHECK (platform IN ('airbnb', 'booking', 'direct', 'other')),
  check_in     date        NOT NULL,
  check_out    date        NOT NULL,
  nb_guests    integer     DEFAULT 2,
  has_baby     boolean     DEFAULT false,
  guest_name   text,
  status       text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'modified')),
  intervention_id uuid     REFERENCES interventions(id),
  raw_data     jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_logement_id  ON reservations(logement_id);
CREATE INDEX IF NOT EXISTS idx_reservations_external_id  ON reservations(external_id);

DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- ALTER TABLE interventions
-- Ajoute la colonne reservation_id et sa FK maintenant que reservations existe.
-- La clause IF NOT EXISTS évite l'erreur si la colonne est déjà présente.
-- =============================================================================

ALTER TABLE interventions ADD COLUMN IF NOT EXISTS reservation_id uuid;

-- On recrée la contrainte proprement (drop si elle existe déjà)
ALTER TABLE interventions DROP CONSTRAINT IF EXISTS interventions_reservation_id_fkey;
ALTER TABLE interventions
  ADD CONSTRAINT interventions_reservation_id_fkey
  FOREIGN KEY (reservation_id) REFERENCES reservations(id);


-- =============================================================================
-- 3.7  invoices
-- Factures bi-mensuelles envoyées aux clients.
-- =============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                        uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                 uuid        NOT NULL REFERENCES profiles(id),
  invoice_number            text        NOT NULL UNIQUE,
  period_start              date        NOT NULL,
  period_end                date        NOT NULL,
  total_menage              numeric     DEFAULT 0,
  total_blanchisserie       numeric     DEFAULT 0,
  total_ttc                 numeric     NOT NULL DEFAULT 0,
  status                    text        NOT NULL DEFAULT 'draft'
                                        CHECK (status IN ('draft', 'sent', 'processing', 'paid', 'overdue', 'failed')),
  pdf_url                   text,
  sent_at                   timestamptz,
  due_date                  date,
  paid_at                   timestamptz,
  stripe_payment_intent_id  text,
  failure_count             integer     DEFAULT 0,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period    ON invoices(period_start, period_end);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- 3.8  invoice_lines
-- Lignes de facturation (ménage, blanchisserie).
-- ON DELETE CASCADE : supprimer une invoice supprime automatiquement ses lignes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS invoice_lines (
  id               uuid     PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       uuid     NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  intervention_id  uuid     REFERENCES interventions(id),
  logement_id      uuid     NOT NULL REFERENCES logements(id),
  type             text     NOT NULL CHECK (type IN ('menage', 'blanchisserie_intervention', 'blanchisserie_forfait')),
  description      text     NOT NULL,
  quantity         integer  DEFAULT 1,
  unit_price       numeric  NOT NULL,
  total            numeric  NOT NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);


-- =============================================================================
-- 3.9  provider_payouts
-- Récapitulatifs de paiement prestataire (virement Qonto manuel).
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_payouts (
  id                 uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestataire_id     uuid        NOT NULL REFERENCES profiles(id),
  period_start       date        NOT NULL,
  period_end         date        NOT NULL,
  nb_interventions   integer     DEFAULT 0,
  total_amount       numeric     NOT NULL DEFAULT 0,
  lines              jsonb       DEFAULT '[]',  -- [{intervention_id, date, logement_name, amount}]
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'validated', 'paid', 'failed')),
  validated_at       timestamptz,
  paid_at            timestamptz,
  payment_reference  text,       -- Référence du virement Qonto
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_payouts_prestataire_id ON provider_payouts(prestataire_id);

DROP TRIGGER IF EXISTS update_provider_payouts_updated_at ON provider_payouts;
CREATE TRIGGER update_provider_payouts_updated_at
  BEFORE UPDATE ON provider_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- VÉRIFICATION FINALE
-- Affiche les 9 tables attendues pour confirmer la bonne exécution.
-- =============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'logements', 'interventions', 'rapports',
    'reservation_sources', 'reservations',
    'invoices', 'invoice_lines', 'provider_payouts'
  )
ORDER BY table_name;
