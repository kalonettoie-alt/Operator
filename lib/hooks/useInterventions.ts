// lib/hooks/useInterventions.ts
// Hook TanStack Query pour la table interventions.
// Supporte des filtres combinables : statut, dates, client, prestataire.

import { useQuery } from "@tanstack/react-query";
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
