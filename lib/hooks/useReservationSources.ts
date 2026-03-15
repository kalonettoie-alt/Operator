// lib/hooks/useReservationSources.ts
// Hooks TanStack Query pour la table reservation_sources.
// Gère le CRUD des sources iCal par logement.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

const QUERY_KEY = "reservation-sources";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReservationSourceRow = Database["public"]["Tables"]["reservation_sources"]["Row"];

export type ReservationSourceWithLogement = ReservationSourceRow & {
  logement: { id: string; name: string; city: string } | null;
};

export type CreateReservationSourceInput = {
  logement_id: string;
  platform: string;
  ical_url: string;
  type: string;
  is_active?: boolean;
  sync_interval_minutes?: number;
};

// ─── Hook : liste de toutes les sources ──────────────────────────────────────

export function useReservationSources() {
  return useQuery<ReservationSourceWithLogement[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_sources")
        .select(
          "*, logement:logements!reservation_sources_logement_id_fkey(id, name, city)"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReservationSourceWithLogement[];
    },
  });
}

// ─── Hook : créer une source ──────────────────────────────────────────────────

export function useCreateReservationSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReservationSourceInput) => {
      const { data, error } = await supabase
        .from("reservation_sources")
        .insert({
          ...input,
          is_active: input.is_active ?? true,
          sync_interval_minutes: input.sync_interval_minutes ?? 60,
        })
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

// ─── Hook : supprimer une source ──────────────────────────────────────────────

export function useDeleteReservationSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Détacher les réservations liées avant suppression
      // (évite l'erreur FK constraint sur reservations.source_id)
      const { error: unlinkErr } = await supabase
        .from("reservations")
        .update({ source_id: null })
        .eq("source_id", id);
      if (unlinkErr) throw unlinkErr;

      const { error } = await supabase
        .from("reservation_sources")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ─── Hook : activer / désactiver une source ───────────────────────────────────

export function useToggleReservationSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("reservation_sources")
        .update({ is_active })
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
