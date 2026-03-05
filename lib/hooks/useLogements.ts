// lib/hooks/useLogements.ts
// Hooks TanStack Query pour la table logements.
// La jointure client est faite directement dans la query Supabase.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Logement } from "@/types/database";

// Clé de cache centralisée
const QUERY_KEY = "logements";

// Type enrichi avec le profil client joint
export type LogementWithClient = Logement & {
  client: {
    id: string;
    full_name: string;
    email: string;
  } | null;
};

// ─── Hook : liste de tous les logements ──────────────────────────────────────

/**
 * Retourne tous les logements avec le nom du client rattaché.
 * Réservé à l'admin (RLS bloque les autres rôles).
 * Optionnel : filtrer par client_id pour les vues client.
 */
export function useLogements(clientId?: string) {
  return useQuery<LogementWithClient[]>({
    queryKey: [QUERY_KEY, { clientId }],
    queryFn: async () => {
      let query = supabase
        .from("logements")
        .select(
          "*, client:profiles!logements_client_id_fkey(id, full_name, email)"
        )
        .order("name");

      if (clientId) query = query.eq("client_id", clientId);

      const { data, error } = await query;
      if (error) throw error;
      return data as LogementWithClient[];
    },
  });
}
