// Ce fichier est la source de vérité des types TypeScript de la base de données.
// Il reflète le schéma complet défini dans ARCHITECTURE.md.
//
// Idéalement régénéré avec :
//   npx supabase gen types typescript --project-id ljcfvpooxndqndvklhln > types/database.ts
// Mis à jour manuellement à l'étape 2.3 pour inclure les 5 nouvelles tables V3.

export type Database = {
  public: {
    Tables: {

      // ──────────────────────────────────────────────────────────────────────
      // 3.1  profiles
      // ──────────────────────────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'admin' | 'client' | 'prestataire';
          phone: string | null;
          company_name: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          zone: string | null;
          max_daily_interventions: number;
          sepa_mandate_id: string | null;
          sepa_status: 'none' | 'pending' | 'active' | 'cancelled' | 'failed';
          iban_last4: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'admin' | 'client' | 'prestataire';
          phone?: string | null;
          company_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          zone?: string | null;
          max_daily_interventions?: number;
          sepa_mandate_id?: string | null;
          sepa_status?: 'none' | 'pending' | 'active' | 'cancelled' | 'failed';
          iban_last4?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'admin' | 'client' | 'prestataire';
          phone?: string | null;
          company_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          zone?: string | null;
          max_daily_interventions?: number;
          sepa_mandate_id?: string | null;
          sepa_status?: 'none' | 'pending' | 'active' | 'cancelled' | 'failed';
          iban_last4?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.2  logements
      // ──────────────────────────────────────────────────────────────────────
      logements: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          address: string;
          city: string;
          postal_code: string;
          access_code: string | null;
          instructions: string | null;
          photos: string[];
          prix_prestataire_ht: number;
          prix_client_ttc: number;
          type_blanchisserie: 'aucune' | 'intervention' | 'forfait';
          prix_blanchisserie: number;
          zone: string | null;
          checklist_template: unknown; // jsonb []
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          address: string;
          city: string;
          postal_code: string;
          access_code?: string | null;
          instructions?: string | null;
          photos?: string[];
          prix_prestataire_ht?: number;
          prix_client_ttc?: number;
          type_blanchisserie?: 'aucune' | 'intervention' | 'forfait';
          prix_blanchisserie?: number;
          zone?: string | null;
          checklist_template?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          address?: string;
          city?: string;
          postal_code?: string;
          access_code?: string | null;
          instructions?: string | null;
          photos?: string[];
          prix_prestataire_ht?: number;
          prix_client_ttc?: number;
          type_blanchisserie?: 'aucune' | 'intervention' | 'forfait';
          prix_blanchisserie?: number;
          zone?: string | null;
          checklist_template?: unknown;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.3  interventions
      // ──────────────────────────────────────────────────────────────────────
      interventions: {
        Row: {
          id: string;
          logement_id: string;
          client_id: string;
          prestataire_id: string | null;
          reservation_id: string | null;
          date: string;
          type: string;
          status: 'a_attribuer' | 'assignee' | 'acceptee' | 'refusee' | 'en_cours' | 'terminee' | 'annulee';
          priority: 'normale' | 'haute';
          nb_voyageurs: number;
          has_baby: boolean;
          checkin_meme_jour: boolean;
          special_instructions: string | null;
          prix_prestataire_ht: number;
          prix_client_ttc: number;
          blanchisserie_incluse: boolean;
          prix_blanchisserie: number;
          assigned_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          cancellation_reason: string | null;
          photos_etat_lieux: string[];
          etat_lieux_at: string | null;
          refused_by: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          logement_id: string;
          client_id: string;
          prestataire_id?: string | null;
          reservation_id?: string | null;
          date: string;
          type?: string;
          status?: 'a_attribuer' | 'assignee' | 'acceptee' | 'refusee' | 'en_cours' | 'terminee' | 'annulee';
          priority?: 'normale' | 'haute';
          nb_voyageurs?: number;
          has_baby?: boolean;
          checkin_meme_jour?: boolean;
          special_instructions?: string | null;
          prix_prestataire_ht?: number;
          prix_client_ttc?: number;
          blanchisserie_incluse?: boolean;
          prix_blanchisserie?: number;
          assigned_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          cancellation_reason?: string | null;
          photos_etat_lieux?: string[];
          etat_lieux_at?: string | null;
          refused_by?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          logement_id?: string;
          client_id?: string;
          prestataire_id?: string | null;
          reservation_id?: string | null;
          date?: string;
          type?: string;
          status?: 'a_attribuer' | 'assignee' | 'acceptee' | 'refusee' | 'en_cours' | 'terminee' | 'annulee';
          priority?: 'normale' | 'haute';
          nb_voyageurs?: number;
          has_baby?: boolean;
          checkin_meme_jour?: boolean;
          special_instructions?: string | null;
          prix_prestataire_ht?: number;
          prix_client_ttc?: number;
          blanchisserie_incluse?: boolean;
          prix_blanchisserie?: number;
          assigned_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          cancellation_reason?: string | null;
          photos_etat_lieux?: string[];
          etat_lieux_at?: string | null;
          refused_by?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.4  rapports
      // ──────────────────────────────────────────────────────────────────────
      rapports: {
        Row: {
          id: string;
          intervention_id: string;
          photos_intervention: string[];
          degats_signales: boolean;
          degats_description: string | null;
          degats_photos: string[];
          taches_effectuees: unknown; // jsonb []
          created_at: string;
        };
        Insert: {
          id?: string;
          intervention_id: string;
          photos_intervention?: string[];
          degats_signales?: boolean;
          degats_description?: string | null;
          degats_photos?: string[];
          taches_effectuees?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          intervention_id?: string;
          photos_intervention?: string[];
          degats_signales?: boolean;
          degats_description?: string | null;
          degats_photos?: string[];
          taches_effectuees?: unknown;
          created_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.5  reservation_sources  [NOUVEAU — étape 2.3]
      // ──────────────────────────────────────────────────────────────────────
      reservation_sources: {
        Row: {
          id: string;
          logement_id: string;
          type: 'ical' | 'webhook';
          platform: 'airbnb' | 'booking' | 'hospitable' | 'guesty' | 'other';
          ical_url: string | null;
          webhook_secret: string | null;
          sync_interval_minutes: number;
          last_synced_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          logement_id: string;
          type: 'ical' | 'webhook';
          platform: 'airbnb' | 'booking' | 'hospitable' | 'guesty' | 'other';
          ical_url?: string | null;
          webhook_secret?: string | null;
          sync_interval_minutes?: number;
          last_synced_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          logement_id?: string;
          type?: 'ical' | 'webhook';
          platform?: 'airbnb' | 'booking' | 'hospitable' | 'guesty' | 'other';
          ical_url?: string | null;
          webhook_secret?: string | null;
          sync_interval_minutes?: number;
          last_synced_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.6  reservations  [NOUVEAU — étape 2.3]
      // ──────────────────────────────────────────────────────────────────────
      reservations: {
        Row: {
          id: string;
          logement_id: string;
          source_id: string | null;
          external_id: string | null;
          platform: 'airbnb' | 'booking' | 'direct' | 'other';
          check_in: string;
          check_out: string;
          nb_guests: number;
          has_baby: boolean;
          guest_name: string | null;
          status: 'active' | 'cancelled' | 'modified';
          intervention_id: string | null;
          raw_data: unknown | null; // jsonb
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          logement_id: string;
          source_id?: string | null;
          external_id?: string | null;
          platform: 'airbnb' | 'booking' | 'direct' | 'other';
          check_in: string;
          check_out: string;
          nb_guests?: number;
          has_baby?: boolean;
          guest_name?: string | null;
          status?: 'active' | 'cancelled' | 'modified';
          intervention_id?: string | null;
          raw_data?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          logement_id?: string;
          source_id?: string | null;
          external_id?: string | null;
          platform?: 'airbnb' | 'booking' | 'direct' | 'other';
          check_in?: string;
          check_out?: string;
          nb_guests?: number;
          has_baby?: boolean;
          guest_name?: string | null;
          status?: 'active' | 'cancelled' | 'modified';
          intervention_id?: string | null;
          raw_data?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.7  invoices  [NOUVEAU — étape 2.3]
      // ──────────────────────────────────────────────────────────────────────
      invoices: {
        Row: {
          id: string;
          client_id: string;
          invoice_number: string;
          period_start: string;
          period_end: string;
          total_menage: number;
          total_blanchisserie: number;
          total_ttc: number;
          status: 'draft' | 'sent' | 'processing' | 'paid' | 'overdue' | 'failed';
          pdf_url: string | null;
          sent_at: string | null;
          due_date: string | null;
          paid_at: string | null;
          stripe_payment_intent_id: string | null;
          failure_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          invoice_number: string;
          period_start: string;
          period_end: string;
          total_menage?: number;
          total_blanchisserie?: number;
          total_ttc?: number;
          status?: 'draft' | 'sent' | 'processing' | 'paid' | 'overdue' | 'failed';
          pdf_url?: string | null;
          sent_at?: string | null;
          due_date?: string | null;
          paid_at?: string | null;
          stripe_payment_intent_id?: string | null;
          failure_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          invoice_number?: string;
          period_start?: string;
          period_end?: string;
          total_menage?: number;
          total_blanchisserie?: number;
          total_ttc?: number;
          status?: 'draft' | 'sent' | 'processing' | 'paid' | 'overdue' | 'failed';
          pdf_url?: string | null;
          sent_at?: string | null;
          due_date?: string | null;
          paid_at?: string | null;
          stripe_payment_intent_id?: string | null;
          failure_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.8  invoice_lines  [NOUVEAU — étape 2.3]
      // ──────────────────────────────────────────────────────────────────────
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          intervention_id: string | null;
          logement_id: string;
          type: 'menage' | 'blanchisserie_intervention' | 'blanchisserie_forfait';
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          intervention_id?: string | null;
          logement_id: string;
          type: 'menage' | 'blanchisserie_intervention' | 'blanchisserie_forfait';
          description: string;
          quantity?: number;
          unit_price: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          intervention_id?: string | null;
          logement_id?: string;
          type?: 'menage' | 'blanchisserie_intervention' | 'blanchisserie_forfait';
          description?: string;
          quantity?: number;
          unit_price?: number;
          total?: number;
          created_at?: string;
        };
      };

      // ──────────────────────────────────────────────────────────────────────
      // 3.9  provider_payouts  [NOUVEAU — étape 2.3]
      // ──────────────────────────────────────────────────────────────────────
      provider_payouts: {
        Row: {
          id: string;
          prestataire_id: string;
          period_start: string;
          period_end: string;
          nb_interventions: number;
          total_amount: number;
          lines: unknown; // jsonb — [{intervention_id, date, logement_name, amount}]
          status: 'pending' | 'validated' | 'paid' | 'failed';
          validated_at: string | null;
          paid_at: string | null;
          payment_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prestataire_id: string;
          period_start: string;
          period_end: string;
          nb_interventions?: number;
          total_amount?: number;
          lines?: unknown;
          status?: 'pending' | 'validated' | 'paid' | 'failed';
          validated_at?: string | null;
          paid_at?: string | null;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prestataire_id?: string;
          period_start?: string;
          period_end?: string;
          nb_interventions?: number;
          total_amount?: number;
          lines?: unknown;
          status?: 'pending' | 'validated' | 'paid' | 'failed';
          validated_at?: string | null;
          paid_at?: string | null;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'admin' | 'client' | 'prestataire';
    };
  };
};

// ─── Types de commodité ───────────────────────────────────────────────────────

// Rôles
export type UserRole = Database['public']['Enums']['user_role'];

// Tables Row (lecture)
export type Profile            = Database['public']['Tables']['profiles']['Row'];
export type Logement           = Database['public']['Tables']['logements']['Row'];
export type Intervention       = Database['public']['Tables']['interventions']['Row'];
export type Rapport            = Database['public']['Tables']['rapports']['Row'];
export type ReservationSource  = Database['public']['Tables']['reservation_sources']['Row'];
export type Reservation        = Database['public']['Tables']['reservations']['Row'];
export type Invoice            = Database['public']['Tables']['invoices']['Row'];
export type InvoiceLine        = Database['public']['Tables']['invoice_lines']['Row'];
export type ProviderPayout     = Database['public']['Tables']['provider_payouts']['Row'];

// Types Insert (création)
export type CreateLogement          = Database['public']['Tables']['logements']['Insert'];
export type CreateIntervention      = Database['public']['Tables']['interventions']['Insert'];
export type CreateRapport           = Database['public']['Tables']['rapports']['Insert'];
export type CreateReservationSource = Database['public']['Tables']['reservation_sources']['Insert'];
export type CreateReservation       = Database['public']['Tables']['reservations']['Insert'];
export type CreateInvoice           = Database['public']['Tables']['invoices']['Insert'];
export type CreateInvoiceLine       = Database['public']['Tables']['invoice_lines']['Insert'];
export type CreateProviderPayout    = Database['public']['Tables']['provider_payouts']['Insert'];
