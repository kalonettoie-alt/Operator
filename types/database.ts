export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      interventions: {
        Row: {
          assigned_at: string | null
          blanchisserie_incluse: boolean | null
          cancellation_reason: string | null
          checkin_meme_jour: boolean | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          date: string
          etat_lieux_at: string | null
          has_baby: boolean | null
          id: string
          logement_id: string
          nb_voyageurs: number | null
          photos_etat_lieux: string[] | null
          prestataire_id: string | null
          priority: string | null
          prix_blanchisserie: number | null
          prix_client_ttc: number | null
          prix_prestataire_ht: number | null
          refused_by: string[] | null
          reservation_id: string | null
          special_instructions: string | null
          started_at: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          blanchisserie_incluse?: boolean | null
          cancellation_reason?: string | null
          checkin_meme_jour?: boolean | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          date: string
          etat_lieux_at?: string | null
          has_baby?: boolean | null
          id?: string
          logement_id: string
          nb_voyageurs?: number | null
          photos_etat_lieux?: string[] | null
          prestataire_id?: string | null
          priority?: string | null
          prix_blanchisserie?: number | null
          prix_client_ttc?: number | null
          prix_prestataire_ht?: number | null
          refused_by?: string[] | null
          reservation_id?: string | null
          special_instructions?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          blanchisserie_incluse?: boolean | null
          cancellation_reason?: string | null
          checkin_meme_jour?: boolean | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          date?: string
          etat_lieux_at?: string | null
          has_baby?: boolean | null
          id?: string
          logement_id?: string
          nb_voyageurs?: number | null
          photos_etat_lieux?: string[] | null
          prestataire_id?: string | null
          priority?: string | null
          prix_blanchisserie?: number | null
          prix_client_ttc?: number | null
          prix_prestataire_ht?: number | null
          refused_by?: string[] | null
          reservation_id?: string | null
          special_instructions?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_prestataire_id_fkey"
            columns: ["prestataire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string | null
          description: string
          id: string
          intervention_id: string | null
          invoice_id: string
          logement_id: string
          quantity: number | null
          total: number
          type: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          intervention_id?: string | null
          invoice_id: string
          logement_id: string
          quantity?: number | null
          total: number
          type: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          intervention_id?: string | null
          invoice_id?: string
          logement_id?: string
          quantity?: number | null
          total?: number
          type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string | null
          due_date: string | null
          failure_count: number | null
          id: string
          invoice_number: string
          paid_at: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          sent_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_blanchisserie: number | null
          total_menage: number | null
          total_ttc: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          due_date?: string | null
          failure_count?: number | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          sent_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_blanchisserie?: number | null
          total_menage?: number | null
          total_ttc?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          due_date?: string | null
          failure_count?: number | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          sent_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_blanchisserie?: number | null
          total_menage?: number | null
          total_ttc?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logements: {
        Row: {
          access_code: string | null
          address: string
          checklist_template: Json | null
          city: string
          client_id: string
          created_at: string | null
          id: string
          instructions: string | null
          name: string
          photos: string[] | null
          postal_code: string
          prix_blanchisserie: number | null
          prix_client_ttc: number | null
          prix_prestataire_ht: number | null
          type_blanchisserie: string | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          access_code?: string | null
          address: string
          checklist_template?: Json | null
          city: string
          client_id: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          name: string
          photos?: string[] | null
          postal_code: string
          prix_blanchisserie?: number | null
          prix_client_ttc?: number | null
          prix_prestataire_ht?: number | null
          type_blanchisserie?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          access_code?: string | null
          address?: string
          checklist_template?: Json | null
          city?: string
          client_id?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          name?: string
          photos?: string[] | null
          postal_code?: string
          prix_blanchisserie?: number | null
          prix_client_ttc?: number | null
          prix_prestataire_ht?: number | null
          type_blanchisserie?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string
          iban_last4: string | null
          id: string
          max_daily_interventions: number | null
          phone: string | null
          role: string
          sepa_mandate_id: string | null
          sepa_status: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          iban_last4?: string | null
          id: string
          max_daily_interventions?: number | null
          phone?: string | null
          role: string
          sepa_mandate_id?: string | null
          sepa_status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          iban_last4?: string | null
          id?: string
          max_daily_interventions?: number | null
          phone?: string | null
          role?: string
          sepa_mandate_id?: string | null
          sepa_status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      provider_payouts: {
        Row: {
          created_at: string | null
          id: string
          lines: Json | null
          nb_interventions: number | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          prestataire_id: string
          status: string
          total_amount: number
          updated_at: string | null
          validated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lines?: Json | null
          nb_interventions?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          prestataire_id: string
          status?: string
          total_amount?: number
          updated_at?: string | null
          validated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lines?: Json | null
          nb_interventions?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          prestataire_id?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_payouts_prestataire_id_fkey"
            columns: ["prestataire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rapports: {
        Row: {
          created_at: string | null
          degats_description: string | null
          degats_photos: string[] | null
          degats_signales: boolean | null
          id: string
          intervention_id: string
          photos_intervention: string[] | null
          taches_effectuees: Json | null
        }
        Insert: {
          created_at?: string | null
          degats_description?: string | null
          degats_photos?: string[] | null
          degats_signales?: boolean | null
          id?: string
          intervention_id: string
          photos_intervention?: string[] | null
          taches_effectuees?: Json | null
        }
        Update: {
          created_at?: string | null
          degats_description?: string | null
          degats_photos?: string[] | null
          degats_signales?: boolean | null
          id?: string
          intervention_id?: string
          photos_intervention?: string[] | null
          taches_effectuees?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rapports_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_sources: {
        Row: {
          created_at: string | null
          ical_url: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          logement_id: string
          platform: string
          sync_interval_minutes: number | null
          type: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string | null
          ical_url?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          logement_id: string
          platform: string
          sync_interval_minutes?: number | null
          type: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string | null
          ical_url?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          logement_id?: string
          platform?: string
          sync_interval_minutes?: number | null
          type?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_sources_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          external_id: string | null
          guest_name: string | null
          has_baby: boolean | null
          id: string
          intervention_id: string | null
          logement_id: string
          nb_guests: number | null
          platform: string
          raw_data: Json | null
          source_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          external_id?: string | null
          guest_name?: string | null
          has_baby?: boolean | null
          id?: string
          intervention_id?: string | null
          logement_id: string
          nb_guests?: number | null
          platform: string
          raw_data?: Json | null
          source_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          external_id?: string | null
          guest_name?: string | null
          has_baby?: boolean | null
          id?: string
          intervention_id?: string | null
          logement_id?: string
          nb_guests?: number | null
          platform?: string
          raw_data?: Json | null
          source_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "reservation_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accepter_intervention: {
        Args: { p_intervention_id: string }
        Returns: Json
      }
      annuler_intervention: {
        Args: { p_intervention_id: string; p_reason?: string }
        Returns: Json
      }
      commencer_intervention: {
        Args: { p_intervention_id: string; p_photos_etat_lieux?: string[] | null }
        Returns: Json
      }
      get_user_role: { Args: never; Returns: string }
      refuser_intervention: {
        Args: { p_intervention_id: string }
        Returns: Json
      }
      terminer_intervention: {
        Args: {
          p_intervention_id: string
          p_photos_intervention?: string[] | null
          p_taches_effectuees?: Json | null
          p_degats_signales?: boolean | null
          p_degats_description?: string | null
          p_degats_photos?: string[] | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// Types de commodité — raccourcis pour les Row types courants
// ---------------------------------------------------------------------------
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Logement = Database['public']['Tables']['logements']['Row']
export type Intervention = Database['public']['Tables']['interventions']['Row']
export type Rapport = Database['public']['Tables']['rapports']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']
export type ReservationSource = Database['public']['Tables']['reservation_sources']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceLine = Database['public']['Tables']['invoice_lines']['Row']
export type ProviderPayout = Database['public']['Tables']['provider_payouts']['Row']

// Types Insert
export type CreateProfileInput = Database['public']['Tables']['profiles']['Insert']
export type CreateLogementInput = Database['public']['Tables']['logements']['Insert']
export type CreateInterventionInput = Database['public']['Tables']['interventions']['Insert']
export type CreateRapportInput = Database['public']['Tables']['rapports']['Insert']
export type CreateReservationInput = Database['public']['Tables']['reservations']['Insert']
export type CreateInvoiceInput = Database['public']['Tables']['invoices']['Insert']
export type CreateInvoiceLineInput = Database['public']['Tables']['invoice_lines']['Insert']
export type CreateProviderPayoutInput = Database['public']['Tables']['provider_payouts']['Insert']

// Types Update
export type UpdateLogementInput = Database['public']['Tables']['logements']['Update']
export type UpdateInterventionInput = Database['public']['Tables']['interventions']['Update']
export type UpdateInvoiceInput = Database['public']['Tables']['invoices']['Update']

// Types des fonctions RPC
export type RpcResult = { success: boolean; message?: string; error?: string }
