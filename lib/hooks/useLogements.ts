// lib/hooks/useLogements.ts
// Hooks TanStack Query pour la table logements.
// La jointure client est faite directement dans la query Supabase.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// Données nécessaires pour créer un logement
export type CreateLogementInput = {
  client_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  access_code?: string | null;
  instructions?: string | null;
  zone?: string | null;
  prix_prestataire_ht?: number | null;
  prix_client_ttc?: number | null;
  type_blanchisserie?: string | null;
  prix_blanchisserie?: number | null;
};

// Données pour la mise à jour (id obligatoire + champs partiels)
export type UpdateLogementInput = Partial<CreateLogementInput> & { id: string };

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

// ─── Hook : créer un logement ─────────────────────────────────────────────────

export function useCreateLogement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLogementInput) => {
      const { data, error } = await supabase
        .from("logements")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ─── Hook : modifier un logement ─────────────────────────────────────────────

export function useUpdateLogement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLogementInput) => {
      const { data, error } = await supabase
        .from("logements")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ─── Hook : supprimer un logement ────────────────────────────────────────────

export function useDeleteLogement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("logements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
