// lib/hooks/useProfiles.ts
// Hooks TanStack Query pour la table profiles.
// Utilisé par les pages admin pour lister clients et prestataires.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { USER_ROLES } from "@/types/enums";

// Clé de cache centralisée
const QUERY_KEY = "profiles";

// ─── Hook : liste des clients ─────────────────────────────────────────────────

/**
 * Retourne la liste de tous les profils ayant le rôle "client".
 * Réservé à l'admin (RLS bloque les autres rôles).
 */
export function useClients() {
  return useQuery<Profile[]>({
    queryKey: [QUERY_KEY, { role: USER_ROLES.CLIENT }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", USER_ROLES.CLIENT)
        .order("full_name");

      if (error) throw new Error(error.message || JSON.stringify(error));
      return data;
    },
  });
}

// ─── Hook : profils par liste d'UUIDs ────────────────────────────────────────

/**
 * Récupère les profils correspondant à une liste d'UUIDs.
 * Utilisé pour résoudre les noms dans refused_by[].
 * La requête est désactivée si la liste est vide.
 */
export function useProfilesByIds(ids: string[]) {
  return useQuery<Pick<Profile, "id" | "full_name">[]>({
    queryKey: [QUERY_KEY, { ids }],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);

      if (error) throw new Error(error.message || JSON.stringify(error));
      return data;
    },
  });
}

// ─── Hook : liste des prestataires ───────────────────────────────────────────

/**
 * Retourne la liste de tous les profils ayant le rôle "prestataire".
 * Réservé à l'admin (RLS bloque les autres rôles).
 */
export function usePrestataires() {
  return useQuery<Profile[]>({
    queryKey: [QUERY_KEY, { role: USER_ROLES.PRESTATAIRE }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", USER_ROLES.PRESTATAIRE)
        .order("full_name");

      if (error) throw new Error(error.message || JSON.stringify(error));
      return data;
    },
  });
}
