// lib/hooks/useRapports.ts
// Hook TanStack Query pour la table rapports.
// Un rapport est lié à une intervention (relation 1-1).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Rapport } from "@/types/database";

const QUERY_KEY = "rapports";

/**
 * Retourne le rapport d'une intervention, ou null si pas encore rempli.
 * Utilise maybeSingle() pour ne pas lever d'erreur si absent.
 */
export function useRapport(interventionId: string) {
  return useQuery<Rapport | null>({
    queryKey: [QUERY_KEY, interventionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rapports")
        .select("*")
        .eq("intervention_id", interventionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!interventionId,
  });
}
