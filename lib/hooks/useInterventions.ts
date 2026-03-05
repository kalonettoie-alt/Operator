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

export type InterventionWithRelations = Intervention & {
  logement: { id: string; name: string; city: string } | null;
  client: { id: string; full_name: string } | null;
  prestataire: { id: string; full_name: string } | null;
};

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * Retourne les interventions avec leurs relations (logement, client, prestataire).
 * Les filtres sont appliqués côté Supabase (pas en mémoire).
 */
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
