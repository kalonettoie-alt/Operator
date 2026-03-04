# ARCHITECTURE.md — Référence technique Deltom Operator V3

---

## 1. STACK TECHNIQUE

| Couche | Technologie | Version | Rôle |
|--------|------------|---------|------|
| Framework | Next.js | 15 (App Router) | Frontend + API Routes serveur |
| Langage | TypeScript | 5.x | Typage strict partout |
| Style | Tailwind CSS | 3.x | Utility-first CSS |
| UI | shadcn/ui | latest | Composants (Button, Dialog, Table, Toast...) |
| Data fetching | TanStack Query | 5.x | Cache, refetch, mutations |
| Formulaires | React Hook Form + Zod | latest | Validation client |
| Auth | Supabase Auth | latest | Email/password, sessions |
| BDD | Supabase PostgreSQL | Pro (25$/mois) | Données, RLS, RPC, pg_cron |
| Storage | Supabase Storage | Pro (8 Go) | Photos interventions |
| Temps réel | Supabase Realtime | Pro | Dashboard admin live |
| Paiements | Stripe | latest | SEPA Direct Debit (clients) |
| PDF | @react-pdf/renderer | latest | Factures PDF (serveur) |
| Compression images | browser-image-compression | latest | Avant upload (client) |
| Monitoring | Sentry | latest | Tracking erreurs |
| Tests | Vitest | latest | Tests unitaires |
| Déploiement | Vercel | Hobby | Auto-deploy GitHub |
| Cron | pg_cron (Supabase Pro) | — | Planification tâches |

---

## 2. VARIABLES D'ENVIRONNEMENT

```bash
# === PUBLIQUES (accessibles côté client) ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# === SECRÈTES (serveur uniquement — JAMAIS côté client) ===
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_... (puis sk_live_... en production)
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=un-token-aleatoire-de-64-caracteres
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 3. SCHÉMA BASE DE DONNÉES (9 tables)

### 3.1 profiles

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY, -- = auth.uid(), pas de default
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client', 'prestataire')),
  phone text,
  company_name text,
  avatar_url text,
  stripe_customer_id text, -- clients : ID Stripe pour SEPA
  zone text, -- prestataires : zone de travail ("Paris 15", "Boulogne"...)
  max_daily_interventions integer DEFAULT 5, -- prestataires : capacité/jour
  sepa_mandate_id text, -- clients : ID du mandat SEPA Stripe
  sepa_status text DEFAULT 'none' CHECK (sepa_status IN ('none', 'pending', 'active', 'cancelled', 'failed')),
  iban_last4 text, -- clients : 4 derniers chiffres IBAN (affichage)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 logements

```sql
CREATE TABLE logements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  access_code text,
  instructions text,
  photos text[] DEFAULT '{}',
  prix_prestataire_ht numeric DEFAULT 0,
  prix_client_ttc numeric DEFAULT 0,
  type_blanchisserie varchar DEFAULT 'aucune' CHECK (type_blanchisserie IN ('aucune', 'intervention', 'forfait')),
  prix_blanchisserie numeric DEFAULT 0,
  zone text, -- zone géographique pour auto-assignation
  checklist_template jsonb DEFAULT '[]', -- checklist personnalisée
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_logements_client_id ON logements(client_id);

CREATE TRIGGER update_logements_updated_at BEFORE UPDATE ON logements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 interventions

```sql
CREATE TABLE interventions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  logement_id uuid NOT NULL REFERENCES logements(id),
  client_id uuid NOT NULL REFERENCES profiles(id),
  prestataire_id uuid REFERENCES profiles(id),
  reservation_id uuid REFERENCES reservations(id),
  date date NOT NULL,
  type text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'a_attribuer' CHECK (status IN ('a_attribuer', 'assignee', 'acceptee', 'refusee', 'en_cours', 'terminee', 'annulee')),
  priority text DEFAULT 'normale' CHECK (priority IN ('normale', 'haute')),
  nb_voyageurs integer DEFAULT 2,
  has_baby boolean DEFAULT false,
  checkin_meme_jour boolean DEFAULT false,
  special_instructions text,
  prix_prestataire_ht numeric DEFAULT 0,
  prix_client_ttc numeric DEFAULT 0,
  blanchisserie_incluse boolean DEFAULT false,
  prix_blanchisserie numeric DEFAULT 0,
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text,
  photos_etat_lieux text[] DEFAULT '{}',
  etat_lieux_at timestamptz,
  refused_by uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_interventions_date ON interventions(date);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_client_id ON interventions(client_id);
CREATE INDEX idx_interventions_prestataire_id ON interventions(prestataire_id);
CREATE INDEX idx_interventions_logement_id ON interventions(logement_id);

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.4 rapports

```sql
CREATE TABLE rapports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervention_id uuid NOT NULL REFERENCES interventions(id),
  photos_intervention text[] DEFAULT '{}',
  degats_signales boolean DEFAULT false,
  degats_description text,
  degats_photos text[] DEFAULT '{}',
  taches_effectuees jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rapports_intervention_id ON rapports(intervention_id);
```

### 3.5 reservation_sources

```sql
CREATE TABLE reservation_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  logement_id uuid NOT NULL REFERENCES logements(id),
  type text NOT NULL CHECK (type IN ('ical', 'webhook')),
  platform text NOT NULL CHECK (platform IN ('airbnb', 'booking', 'hospitable', 'guesty', 'other')),
  ical_url text,
  webhook_secret text,
  sync_interval_minutes integer DEFAULT 30,
  last_synced_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reservation_sources_logement_id ON reservation_sources(logement_id);
```

### 3.6 reservations

```sql
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  logement_id uuid NOT NULL REFERENCES logements(id),
  source_id uuid REFERENCES reservation_sources(id),
  external_id text, -- ID Airbnb/Booking pour dédoublonnage
  platform text NOT NULL CHECK (platform IN ('airbnb', 'booking', 'direct', 'other')),
  check_in date NOT NULL,
  check_out date NOT NULL,
  nb_guests integer DEFAULT 2,
  has_baby boolean DEFAULT false,
  guest_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'modified')),
  intervention_id uuid REFERENCES interventions(id),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reservations_logement_id ON reservations(logement_id);
CREATE INDEX idx_reservations_external_id ON reservations(external_id);

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.7 invoices

```sql
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES profiles(id),
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_menage numeric DEFAULT 0,
  total_blanchisserie numeric DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'processing', 'paid', 'overdue', 'failed')),
  pdf_url text,
  sent_at timestamptz,
  due_date date,
  paid_at timestamptz,
  stripe_payment_intent_id text,
  failure_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_period ON invoices(period_start, period_end);

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.8 invoice_lines

```sql
CREATE TABLE invoice_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES interventions(id),
  logement_id uuid NOT NULL REFERENCES logements(id),
  type text NOT NULL CHECK (type IN ('menage', 'blanchisserie_intervention', 'blanchisserie_forfait')),
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
```

### 3.9 provider_payouts

```sql
CREATE TABLE provider_payouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestataire_id uuid NOT NULL REFERENCES profiles(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  nb_interventions integer DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  lines jsonb DEFAULT '[]', -- détail par intervention [{intervention_id, date, logement_name, amount}]
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid', 'failed')),
  validated_at timestamptz,
  paid_at timestamptz,
  payment_reference text, -- référence du virement Qonto
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_provider_payouts_prestataire_id ON provider_payouts(prestataire_id);

CREATE TRIGGER update_provider_payouts_updated_at BEFORE UPDATE ON provider_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 4. FONCTIONS RPC

### Utilitaires

```sql
-- Récupérer le rôle de l'utilisateur connecté (utilisé dans toutes les RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$;

-- Trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Workflow prestataire

```sql
-- Accepter une intervention
CREATE OR REPLACE FUNCTION accepter_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Intervention non trouvée'); END IF;
  IF v_intervention.prestataire_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Non autorisé'); END IF;
  IF v_intervention.status != 'assignee' THEN RETURN json_build_object('success', false, 'error', 'Statut invalide'); END IF;

  UPDATE interventions SET status = 'acceptee', updated_at = NOW() WHERE id = p_intervention_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Refuser une intervention (AVEC vérification du statut)
CREATE OR REPLACE FUNCTION refuser_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Intervention non trouvée'); END IF;
  IF v_intervention.prestataire_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Non autorisé'); END IF;
  IF v_intervention.status != 'assignee' THEN RETURN json_build_object('success', false, 'error', 'Statut invalide'); END IF;

  UPDATE interventions SET
    prestataire_id = NULL,
    status = 'a_attribuer',
    refused_by = array_append(COALESCE(refused_by, '{}'), v_user_id),
    updated_at = NOW()
  WHERE id = p_intervention_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Commencer une intervention
CREATE OR REPLACE FUNCTION commencer_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Intervention non trouvée'); END IF;
  IF v_intervention.prestataire_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Non autorisé'); END IF;
  IF v_intervention.status != 'acceptee' THEN RETURN json_build_object('success', false, 'error', 'Statut invalide'); END IF;

  UPDATE interventions SET status = 'en_cours', started_at = NOW(), updated_at = NOW() WHERE id = p_intervention_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Terminer une intervention
CREATE OR REPLACE FUNCTION terminer_intervention(p_intervention_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Intervention non trouvée'); END IF;
  IF v_intervention.prestataire_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Non autorisé'); END IF;
  IF v_intervention.status != 'en_cours' THEN RETURN json_build_object('success', false, 'error', 'Statut invalide'); END IF;

  UPDATE interventions SET status = 'terminee', completed_at = NOW(), updated_at = NOW() WHERE id = p_intervention_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Annuler une intervention (admin uniquement)
CREATE OR REPLACE FUNCTION annuler_intervention(p_intervention_id uuid, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_intervention interventions%ROWTYPE;
BEGIN
  IF get_user_role() != 'admin' THEN RETURN json_build_object('success', false, 'error', 'Non autorisé'); END IF;

  SELECT * INTO v_intervention FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Intervention non trouvée'); END IF;
  IF v_intervention.status IN ('terminee', 'annulee') THEN RETURN json_build_object('success', false, 'error', 'Statut invalide'); END IF;

  UPDATE interventions SET
    status = 'annulee',
    cancellation_reason = p_reason,
    prestataire_id = NULL,
    updated_at = NOW()
  WHERE id = p_intervention_id;
  RETURN json_build_object('success', true);
END;
$$;
```

---

## 5. RLS POLICIES

```sql
-- === PROFILES ===
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_admin ON profiles FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- === LOGEMENTS ===
ALTER TABLE logements ENABLE ROW LEVEL SECURITY;

CREATE POLICY logements_admin_all ON logements FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY logements_select_client ON logements FOR SELECT USING (get_user_role() = 'client' AND client_id = auth.uid());
CREATE POLICY logements_select_prestataire ON logements FOR SELECT USING (
  get_user_role() = 'prestataire' AND id IN (
    SELECT logement_id FROM interventions WHERE prestataire_id = auth.uid()
  )
);

-- === INTERVENTIONS ===
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY interventions_admin_all ON interventions FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY interventions_select_client ON interventions FOR SELECT USING (get_user_role() = 'client' AND client_id = auth.uid());
CREATE POLICY interventions_select_prestataire ON interventions FOR SELECT USING (get_user_role() = 'prestataire' AND prestataire_id = auth.uid());
-- Note : le prestataire ne fait PAS de UPDATE direct — il passe par les RPC (SECURITY DEFINER)

-- === RAPPORTS ===
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

CREATE POLICY rapports_admin_all ON rapports FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY rapports_insert_prestataire ON rapports FOR INSERT WITH CHECK (
  get_user_role() = 'prestataire' AND intervention_id IN (
    SELECT id FROM interventions WHERE prestataire_id = auth.uid()
  )
);
CREATE POLICY rapports_select_client ON rapports FOR SELECT USING (
  get_user_role() = 'client' AND intervention_id IN (
    SELECT id FROM interventions WHERE client_id = auth.uid()
  )
);
CREATE POLICY rapports_select_prestataire ON rapports FOR SELECT USING (
  get_user_role() = 'prestataire' AND intervention_id IN (
    SELECT id FROM interventions WHERE prestataire_id = auth.uid()
  )
);

-- === RESERVATION_SOURCES ===
ALTER TABLE reservation_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservation_sources_admin_all ON reservation_sources FOR ALL USING (get_user_role() = 'admin');

-- === RESERVATIONS ===
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservations_admin_all ON reservations FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY reservations_select_client ON reservations FOR SELECT USING (
  get_user_role() = 'client' AND logement_id IN (
    SELECT id FROM logements WHERE client_id = auth.uid()
  )
);

-- === INVOICES ===
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_admin_all ON invoices FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY invoices_select_client ON invoices FOR SELECT USING (get_user_role() = 'client' AND client_id = auth.uid());

-- === INVOICE_LINES ===
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_lines_admin_all ON invoice_lines FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY invoice_lines_select_client ON invoice_lines FOR SELECT USING (
  get_user_role() = 'client' AND invoice_id IN (
    SELECT id FROM invoices WHERE client_id = auth.uid()
  )
);

-- === PROVIDER_PAYOUTS ===
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_payouts_admin_all ON provider_payouts FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY provider_payouts_select_prestataire ON provider_payouts FOR SELECT USING (get_user_role() = 'prestataire' AND prestataire_id = auth.uid());
```

---

## 6. CRON JOBS (pg_cron)

```sql
-- Sync iCal toutes les 30 minutes
SELECT cron.schedule('sync-ical', '*/30 * * * *',
  $$ SELECT net.http_post(
    url := 'https://ton-app.vercel.app/api/cron/sync-ical',
    headers := '{"Authorization": "Bearer CRON_SECRET_VALUE"}'::jsonb
  ) $$
);

-- Générer factures le 1er et 16 du mois à 6h
SELECT cron.schedule('generate-invoices-1', '0 6 1 * *',
  $$ SELECT net.http_post(
    url := 'https://ton-app.vercel.app/api/cron/generate-invoices',
    headers := '{"Authorization": "Bearer CRON_SECRET_VALUE"}'::jsonb
  ) $$
);
SELECT cron.schedule('generate-invoices-16', '0 6 16 * *',
  $$ SELECT net.http_post(
    url := 'https://ton-app.vercel.app/api/cron/generate-invoices',
    headers := '{"Authorization": "Bearer CRON_SECRET_VALUE"}'::jsonb
  ) $$
);

-- Prélèvements SEPA le 1er et 16 à 8h
SELECT cron.schedule('process-sepa-1', '0 8 1 * *',
  $$ SELECT net.http_post(
    url := 'https://ton-app.vercel.app/api/cron/process-sepa',
    headers := '{"Authorization": "Bearer CRON_SECRET_VALUE"}'::jsonb
  ) $$
);
SELECT cron.schedule('process-sepa-16', '0 8 16 * *',
  $$ SELECT net.http_post(
    url := 'https://ton-app.vercel.app/api/cron/process-sepa',
    headers := '{"Authorization": "Bearer CRON_SECRET_VALUE"}'::jsonb
  ) $$
);

-- Vérifier statut paiements quotidien à 9h
SELECT cron.schedule('check-payments', '0 9 * * *',
  $$ SELECT net.http_post(
    url := 'https://ton-app.vercel.app/api/cron/check-payment-status',
    headers := '{"Authorization": "Bearer CRON_SECRET_VALUE"}'::jsonb
  ) $$
);
```

---

## 7. STRUCTURE DES DOSSIERS

```
deltom-operator-v3/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    ← Dashboard
│   │   ├── clients/page.tsx
│   │   ├── prestataires/page.tsx
│   │   ├── logements/page.tsx
│   │   ├── interventions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── calendrier/page.tsx
│   │   ├── historique/page.tsx
│   │   ├── estimations/page.tsx
│   │   ├── facturation/page.tsx        ← NOUVEAU
│   │   └── reservations/page.tsx       ← NOUVEAU
│   ├── client/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── logements/page.tsx
│   │   ├── interventions/page.tsx
│   │   ├── calendrier/page.tsx
│   │   ├── historique/page.tsx
│   │   └── factures/page.tsx           ← NOUVEAU
│   ├── prestataire/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── missions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── planning/page.tsx
│   │   ├── historique/page.tsx
│   │   └── wallet/page.tsx             ← NOUVEAU
│   └── api/
│       ├── webhooks/stripe/route.ts
│       ├── webhooks/reservations/route.ts
│       ├── cron/sync-ical/route.ts
│       ├── cron/generate-invoices/route.ts
│       ├── cron/process-sepa/route.ts
│       ├── cron/check-payment-status/route.ts
│       ├── stripe/create-mandate/route.ts
│       ├── stripe/charge/route.ts
│       ├── stripe/test/route.ts
│       ├── invoices/generate/route.ts
│       ├── invoices/[id]/pdf/route.ts
│       ├── payouts/generate/route.ts
│       └── assignment/scores/route.ts
├── components/
│   ├── ui/          ← shadcn/ui
│   ├── layout/      ← Sidebar, Header, BottomNav
│   ├── cards/       ← InterventionCard, LogementCard...
│   ├── forms/       ← LogementForm, InterventionForm, ReportForm
│   └── modals/      ← EtatDesLieuxModal...
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── stripe/
│   │   └── client.ts
│   ├── utils/
│   │   ├── finance.ts
│   │   ├── dates.ts
│   │   ├── images.ts
│   │   ├── assignment.ts
│   │   └── __tests__/
│   │       ├── finance.test.ts
│   │       ├── dates.test.ts
│   │       └── assignment.test.ts
│   └── hooks/
│       ├── useAuth.ts
│       ├── useInterventions.ts
│       ├── useLogements.ts
│       ├── useProfiles.ts
│       ├── useRapports.ts
│       ├── useInvoices.ts
│       ├── useReservations.ts
│       ├── usePayouts.ts
│       └── useRealtime.ts
├── types/
│   ├── enums.ts
│   └── database.ts
├── middleware.ts
├── CLAUDE.md
├── ARCHITECTURE.md
├── .env.local
├── .env.example
└── package.json
```

---

## 8. FLUX DE PAIEMENT

### PRÉLÈVEMENT CLIENT :

1. Admin crée mandat SEPA → `POST /api/stripe/create-mandate` → Stripe Customer + SetupIntent
2. Client confirme IBAN → mandat actif → `profiles.sepa_status = 'active'`
3. Cron génère facture → `invoices.status = 'draft'`
4. Admin valide → `invoices.status = 'sent'` → email au client
5. Cron prélève → `POST /api/stripe/charge` → `invoices.status = 'processing'`
6. Webhook Stripe → `payment_intent.succeeded` → `invoices.status = 'paid'`
7. Webhook Stripe → `payment_intent.payment_failed` → `invoices.status = 'failed'`, `failure_count++`

### PAIEMENT PRESTATAIRE :

1. Admin génère récapitulatif → `POST /api/payouts/generate` → `provider_payouts.status = 'pending'`
2. Admin valide → `provider_payouts.status = 'validated'`
3. Admin fait le virement sur Qonto manuellement
4. Admin marque comme payé → `provider_payouts.status = 'paid'`, `payment_reference = 'REF_QONTO'`
