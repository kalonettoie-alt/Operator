export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      early_checkins: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          intervention_id: string
          paid_at: string | null
          price: number
          requested_hours: number
          reservation_id: string
          status: Database["public"]["Enums"]["early_checkin_status"] | null
          stripe_checkout_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          intervention_id: string
          paid_at?: string | null
          price: number
          requested_hours: number
          reservation_id: string
          status?: Database["public"]["Enums"]["early_checkin_status"] | null
          stripe_checkout_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          intervention_id?: string
          paid_at?: string | null
          price?: number
          requested_hours?: number
          reservation_id?: string
          status?: Database["public"]["Enums"]["early_checkin_status"] | null
          stripe_checkout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "early_checkins_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_checkins_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          intervention_id: string
          provider_id: string
          rating: number
          reservation_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          intervention_id: string
          provider_id: string
          rating: number
          reservation_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          intervention_id?: string
          provider_id?: string
          rating?: number
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_reviews_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_sources: {
        Row: {
          consecutive_failures: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          platform: string | null
          property_id: string
          url: string
        }
        Insert: {
          consecutive_failures?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          platform?: string | null
          property_id: string
          url: string
        }
        Update: {
          consecutive_failures?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          platform?: string | null
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_sources_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_photos: {
        Row: {
          created_at: string | null
          id: string
          intervention_id: string
          label: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intervention_id: string
          label?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intervention_id?: string
          label?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_photos_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          checklist: Json | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          deltom_commission: number
          early_checkin_deadline: string | null
          id: string
          owner_reminder: string | null
          price: number
          property_id: string
          provider_id: string | null
          provider_payout: number
          reservation_id: string | null
          scheduled_date: string
          scheduled_time: string
          started_at: string | null
          status: Database["public"]["Enums"]["intervention_status"]
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checklist?: Json | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          deltom_commission: number
          early_checkin_deadline?: string | null
          id?: string
          owner_reminder?: string | null
          price: number
          property_id: string
          provider_id?: string | null
          provider_payout: number
          reservation_id?: string | null
          scheduled_date: string
          scheduled_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checklist?: Json | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          deltom_commission?: number
          early_checkin_deadline?: string | null
          id?: string
          owner_reminder?: string | null
          price?: number
          property_id?: string
          provider_id?: string | null
          provider_payout?: number
          reservation_id?: string | null
          scheduled_date?: string
          scheduled_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
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
            foreignKeyName: "interventions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_provider_id_fkey"
            columns: ["provider_id"]
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
      invoice_runs: {
        Row: {
          executed_at: string | null
          id: string
          invoices_created: number | null
          period_key: string
        }
        Insert: {
          executed_at?: string | null
          id?: string
          invoices_created?: number | null
          period_key: string
        }
        Update: {
          executed_at?: string | null
          id?: string
          invoices_created?: number | null
          period_key?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string | null
          html_content: string | null
          id: string
          invoice_number: string
          management_fee: number | null
          paid_at: string | null
          period_end: string
          period_start: string
          sepa_batch_id: string | null
          sepa_payment_intent_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          total: number
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string | null
          html_content?: string | null
          id?: string
          invoice_number: string
          management_fee?: number | null
          paid_at?: string | null
          period_end: string
          period_start: string
          sepa_batch_id?: string | null
          sepa_payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string | null
          html_content?: string | null
          id?: string
          invoice_number?: string
          management_fee?: number | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          sepa_batch_id?: string | null
          sepa_payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total?: number
          updated_at?: string | null
          vat_rate?: number | null
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
      notification_tokens: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          intervention_ids: string[] | null
          paid_at: string | null
          period_end: string
          period_start: string
          provider_id: string
          sepa_batch_id: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          intervention_ids?: string[] | null
          paid_at?: string | null
          period_end: string
          period_start: string
          provider_id: string
          sepa_batch_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          intervention_ids?: string[] | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          provider_id?: string
          sepa_batch_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: { id: string; processed_at: string | null }
        Insert: { id: string; processed_at?: string | null }
        Update: { id?: string; processed_at?: string | null }
        Relationships: []
      }
      profiles: {
        Row: {
          certification_passed: boolean | null
          certification_score: number | null
          company_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          formation_paid: boolean | null
          id: string
          is_auto_entrepreneur: boolean | null
          kit_validated: boolean | null
          last_name: string | null
          monthly_target: number | null
          notification_token: string | null
          phone: string | null
          provider_status: Database["public"]["Enums"]["provider_status"] | null
          rating: number | null
          rating_count: number | null
          role: Database["public"]["Enums"]["user_role"]
          sepa_customer_id: string | null
          sepa_mandate_active: boolean | null
          siret: string | null
          skills: string[] | null
          stripe_account_id: string | null
          updated_at: string | null
          zones: string[] | null
        }
        Insert: {
          certification_passed?: boolean | null
          certification_score?: number | null
          company_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          formation_paid?: boolean | null
          id: string
          is_auto_entrepreneur?: boolean | null
          kit_validated?: boolean | null
          last_name?: string | null
          monthly_target?: number | null
          notification_token?: string | null
          phone?: string | null
          provider_status?: Database["public"]["Enums"]["provider_status"] | null
          rating?: number | null
          rating_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          sepa_customer_id?: string | null
          sepa_mandate_active?: boolean | null
          siret?: string | null
          skills?: string[] | null
          stripe_account_id?: string | null
          updated_at?: string | null
          zones?: string[] | null
        }
        Update: {
          certification_passed?: boolean | null
          certification_score?: number | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          formation_paid?: boolean | null
          id?: string
          is_auto_entrepreneur?: boolean | null
          kit_validated?: boolean | null
          last_name?: string | null
          monthly_target?: number | null
          notification_token?: string | null
          phone?: string | null
          provider_status?: Database["public"]["Enums"]["provider_status"] | null
          rating?: number | null
          rating_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          sepa_customer_id?: string | null
          sepa_mandate_active?: boolean | null
          siret?: string | null
          skills?: string[] | null
          stripe_account_id?: string | null
          updated_at?: string | null
          zones?: string[] | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_code_encrypted: string | null
          address: string
          baby_beds: number | null
          balcony: boolean | null
          base_price: number
          checkin_time: string | null
          checkout_time: string | null
          city: string
          client_id: string
          consumables_kits: string[] | null
          created_at: string | null
          double_beds: number | null
          floor: number | null
          guest_link_enabled: boolean | null
          has_elevator: boolean | null
          has_key_box: boolean | null
          has_spare_keys: boolean | null
          id: string
          internal_name: string | null
          is_active: boolean | null
          jacuzzi: boolean | null
          key_box_code_encrypted: string | null
          latitude: number | null
          laundry_enabled: boolean | null
          longitude: number | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          owner_reminder: string | null
          parking: boolean | null
          pets_allowed: boolean | null
          photo_report_enabled: boolean | null
          postal_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          report_extras: string[] | null
          single_beds: number | null
          sofa_beds: number | null
          specificities: string[] | null
          updated_at: string | null
          wifi_code_encrypted: string | null
        }
        Insert: {
          access_code_encrypted?: string | null
          address: string
          baby_beds?: number | null
          balcony?: boolean | null
          base_price: number
          checkin_time?: string | null
          checkout_time?: string | null
          city: string
          client_id: string
          consumables_kits?: string[] | null
          created_at?: string | null
          double_beds?: number | null
          floor?: number | null
          guest_link_enabled?: boolean | null
          has_elevator?: boolean | null
          has_key_box?: boolean | null
          has_spare_keys?: boolean | null
          id?: string
          internal_name?: string | null
          is_active?: boolean | null
          jacuzzi?: boolean | null
          key_box_code_encrypted?: string | null
          latitude?: number | null
          laundry_enabled?: boolean | null
          longitude?: number | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          owner_reminder?: string | null
          parking?: boolean | null
          pets_allowed?: boolean | null
          photo_report_enabled?: boolean | null
          postal_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          report_extras?: string[] | null
          single_beds?: number | null
          sofa_beds?: number | null
          specificities?: string[] | null
          updated_at?: string | null
          wifi_code_encrypted?: string | null
        }
        Update: {
          access_code_encrypted?: string | null
          address?: string
          baby_beds?: number | null
          balcony?: boolean | null
          base_price?: number
          checkin_time?: string | null
          checkout_time?: string | null
          city?: string
          client_id?: string
          consumables_kits?: string[] | null
          created_at?: string | null
          double_beds?: number | null
          floor?: number | null
          guest_link_enabled?: boolean | null
          has_elevator?: boolean | null
          has_key_box?: boolean | null
          has_spare_keys?: boolean | null
          id?: string
          internal_name?: string | null
          is_active?: boolean | null
          jacuzzi?: boolean | null
          key_box_code_encrypted?: string | null
          latitude?: number | null
          laundry_enabled?: boolean | null
          longitude?: number | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          owner_reminder?: string | null
          parking?: boolean | null
          pets_allowed?: boolean | null
          photo_report_enabled?: boolean | null
          postal_code?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          report_extras?: string[] | null
          single_beds?: number | null
          sofa_beds?: number | null
          specificities?: string[] | null
          updated_at?: string | null
          wifi_code_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          created_at: string | null
          id: string
          provider_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          provider_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          storage_path?: string
          type?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          cancelled_at: string | null
          checkin_date: string
          checkout_date: string
          created_at: string | null
          guest_name: string | null
          guest_token: string | null
          ical_source_id: string | null
          ical_uid: string
          id: string
          is_cancelled: boolean | null
          platform: string | null
          property_id: string
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          checkin_date: string
          checkout_date: string
          created_at?: string | null
          guest_name?: string | null
          guest_token?: string | null
          ical_source_id?: string | null
          ical_uid: string
          id?: string
          is_cancelled?: boolean | null
          platform?: string | null
          property_id: string
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          checkin_date?: string
          checkout_date?: string
          created_at?: string | null
          guest_name?: string | null
          guest_token?: string | null
          ical_source_id?: string | null
          ical_uid?: string
          id?: string
          is_cancelled?: boolean | null
          platform?: string | null
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_ical_source_id_fkey"
            columns: ["ical_source_id"]
            isOneToOne: false
            referencedRelation: "ical_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activate_provider: {
        Args: { p_provider_id: string }
        Returns: undefined
      }
      admin_assign_provider: {
        Args: { p_intervention_id: string; p_provider_id: string }
        Returns: undefined
      }
      admin_validate_document: {
        Args: {
          p_approved: boolean
          p_document_id: string
          p_rejection_reason?: string
        }
        Returns: undefined
      }
      admin_validate_payout: {
        Args: { p_payout_id: string }
        Returns: undefined
      }
      check_provider_activation: {
        Args: { p_provider_id: string }
        Returns: undefined
      }
      client_add_ical_source: {
        Args: { p_platform?: string; p_property_id: string; p_url: string }
        Returns: string
      }
      client_create_property: {
        Args: {
          p_access_code?: string
          p_address: string
          p_baby_beds?: number
          p_balcony?: boolean
          p_checkin_time?: string
          p_checkout_time?: string
          p_city: string
          p_consumables_kits?: string[]
          p_double_beds?: number
          p_floor?: number
          p_guest_link_enabled?: boolean
          p_has_elevator?: boolean
          p_has_key_box?: boolean
          p_has_spare_keys?: boolean
          p_jacuzzi?: boolean
          p_key_box_code?: string
          p_latitude?: number
          p_laundry_enabled?: boolean
          p_longitude?: number
          p_offer_type: Database["public"]["Enums"]["offer_type"]
          p_owner_reminder?: string
          p_parking?: boolean
          p_pets_allowed?: boolean
          p_photo_report_enabled?: boolean
          p_postal_code: string
          p_property_type: Database["public"]["Enums"]["property_type"]
          p_report_extras?: string[]
          p_single_beds?: number
          p_sofa_beds?: number
          p_specificities?: string[]
          p_wifi_code?: string
        }
        Returns: string
      }
      client_update_profile: {
        Args: { p_first_name?: string; p_last_name?: string; p_phone?: string }
        Returns: undefined
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      provider_accept_mission: {
        Args: { p_intervention_id: string }
        Returns: undefined
      }
      provider_add_intervention_photo: {
        Args: {
          p_intervention_id: string
          p_label?: string
          p_type: string
          p_url: string
        }
        Returns: undefined
      }
      provider_complete_intervention: {
        Args: { p_intervention_id: string }
        Returns: undefined
      }
      provider_mark_formation_done: { Args: never; Returns: undefined }
      provider_refuse_mission: {
        Args: { p_intervention_id: string; p_reason?: string }
        Returns: undefined
      }
      provider_save_certification: {
        Args: { p_score: number }
        Returns: undefined
      }
      provider_save_details: {
        Args: {
          p_company_name: string
          p_is_auto_entrepreneur: boolean
          p_siret: string
          p_skills: string[]
          p_zones: string[]
        }
        Returns: undefined
      }
      provider_start_mission: {
        Args: { p_intervention_id: string }
        Returns: undefined
      }
      provider_submit_onboarding: { Args: never; Returns: undefined }
      provider_update_checklist: {
        Args: {
          p_checked: boolean
          p_intervention_id: string
          p_item_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      document_status: "pending" | "approved" | "rejected"
      document_type: "id" | "kbis" | "insurance" | "rib" | "other"
      early_checkin_status: "requested" | "approved" | "paid" | "refused" | "expired"
      intervention_status: "pending" | "assigned" | "accepted" | "in_progress" | "completed" | "cancelled" | "disputed"
      invoice_status: "draft" | "sent" | "pending_payment" | "paid" | "failed"
      offer_type: "operator" | "city_operator"
      payout_status: "pending" | "ready_to_transfer" | "validated" | "paid" | "failed"
      property_type: "studio" | "T2" | "T3" | "T4+"
      provider_status: "pending" | "active" | "suspended"
      user_role: "client" | "provider" | "admin"
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_status: ["pending", "approved", "rejected"],
      document_type: ["id", "kbis", "insurance", "rib", "other"],
      early_checkin_status: ["requested", "approved", "paid", "refused", "expired"],
      intervention_status: ["pending", "assigned", "accepted", "in_progress", "completed", "cancelled", "disputed"],
      invoice_status: ["draft", "sent", "pending_payment", "paid", "failed"],
      offer_type: ["operator", "city_operator"],
      payout_status: ["pending", "ready_to_transfer", "validated", "paid", "failed"],
      property_type: ["studio", "T2", "T3", "T4+"],
      provider_status: ["pending", "active", "suspended"],
      user_role: ["client", "provider", "admin"],
    },
  },
} as const
