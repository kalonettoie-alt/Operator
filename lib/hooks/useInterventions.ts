// lib/hooks/useInterventions.ts
// Hook TanStack Query pour la table interventions.
// Supporte des filtres combinables : statut, dates, client, prestataire.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Intervention } from "@/types/database";
import type { InterventionStatus } from "@/types/enums";

// Clé de cache centralisée
const QUERY_KEY = "interventions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterventionFilters {
  status?: InterventionStatus;
  dateFrom?: string; // format YYYY-MM-DD
  dateTo?: string;   // format YYYY-MM-DD
  clientId?: string;
  prestataireId?: string;
}

// Type pour la liste (champs allégés)
export type InterventionWithRelations = Intervention & {
  logement: { id: string; name: string; city: string } | null;
  client: { id: string; full_name: string } | null;
  prestataire: { id: string; full_name: string } | null;
};

// Type enrichi pour la vue détail
export type InterventionDetail = Intervention & {
  logement: {
    id: string; name: string; address: string; city: string;
    postal_code: string; instructions: string | null;
    access_code: string | null; zone: string | null;
  } | null;
  client: { id: string; full_name: string; email: string; phone: string | null } | null;
  prestataire: { id: string; full_name: string; phone: string | null } | null;
};

// Données nécessaires pour créer une intervention
export type CreateInterventionInput = {
  logement_id: string;
  client_id: string;
  prestataire_id?: string | null;
  date: string;
  type: string;
  status: string;
  priority: string;
  nb_voyageurs?: number | null;
  has_baby?: boolean | null;
  checkin_meme_jour?: boolean | null;
  special_instructions?: string | null;
  blanchisserie_incluse?: boolean | null;
  prix_blanchisserie?: number | null;
  prix_client_ttc?: number | null;
  prix_prestataire_ht?: number | null;
};

// Données pour la mise à jour
export type UpdateInterventionInput = Partial<CreateInterventionInput> & { id: string };

// ─── Hook : intervention unique (vue détail) ──────────────────────────────────

export function useIntervention(id: string) {
  return useQuery<InterventionDetail>({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select(`
          *,
          logement:logements!interventions_logement_id_fkey(id, name, address, city, postal_code, instructions, access_code, zone),
          client:profiles!interventions_client_id_fkey(id, full_name, email, phone),
          prestataire:profiles!interventions_prestataire_id_fkey(id, full_name, phone)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as InterventionDetail;
    },
    enabled: !!id,
  });
}

// ─── Hook : liste avec filtres ────────────────────────────────────────────────

export function useInterventions(filters: InterventionFilters = {}) {
  const { status, dateFrom, dateTo, clientId, prestataireId } = filters;

  return useQuery<InterventionWithRelations[]>({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("interventions")
        .select(`
          *,
          logement:logements!interventions_logement_id_fkey(id, name, city),
          client:profiles!interventions_client_id_fkey(id, full_name),
          prestataire:profiles!interventions_prestataire_id_fkey(id, full_name)
        `)
        .order("date", { ascending: false });

      if (status)         query = query.eq("status", status);
      if (dateFrom)       query = query.gte("date", dateFrom);
      if (dateTo)         query = query.lte("date", dateTo);
      if (clientId)       query = query.eq("client_id", clientId);
      if (prestataireId)  query = query.eq("prestataire_id", prestataireId);

      const { data, error } = await query;
      if (error) throw error;
      return data as InterventionWithRelations[];
    },
  });
}

// ─── Hook : créer une intervention ───────────────────────────────────────────

export function useCreateIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInterventionInput) => {
      const { data, error } = await supabase
        .from("interventions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalide la liste d'interventions ET le dashboard (clés séparées)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
    },
  });
}

// ─── Hook : assigner un prestataire ──────────────────────────────────────────

export function useAssignIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      interventionId,
      prestataireId,
    }: {
      interventionId: string;
      prestataireId: string;
    }) => {
      const { data, error } = await supabase
        .from("interventions")
        .update({
          prestataire_id: prestataireId,
          status: "assignee",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", interventionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id], refetchType: "all" });
      }
    },
  });
}

// ─── Hook : désassigner un prestataire ───────────────────────────────────────

export function useDesassignIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interventionId: string) => {
      const { data, error } = await supabase
        .from("interventions")
        .update({
          prestataire_id: null,
          status: "a_attribuer",
          assigned_at: null,
        })
        .eq("id", interventionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id], refetchType: "all" });
      }
    },
  });
}

// ─── Hook : annuler une intervention ─────────────────────────────────────────

export function useAnnulerIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      interventionId,
      motif,
    }: {
      interventionId: string;
      motif: string;
    }) => {
      const { data, error } = await supabase
        .from("interventions")
        .update({
          status: "annulee",
          cancellation_reason: motif,
          prestataire_id: null,
          assigned_at: null,
        })
        .eq("id", interventionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id], refetchType: "all" });
      }
    },
  });
}

// ─── Hook : modifier une intervention ────────────────────────────────────────

export function useUpdateIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateInterventionInput) => {
      const { data, error } = await supabase
        .from("interventions")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalide liste + détail + dashboard (clés séparées)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id], refetchType: "all" });
      }
    },
  });
}
