// lib/hooks/useMissionsPrestataire.ts
// Hooks TanStack Query pour l'espace prestataire.
// Toutes les requêtes filtrent sur l'id du prestataire connecté.
// La RLS Supabase constitue un second garde-fou côté serveur.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Intervention } from "@/types/database";
import { INTERVENTION_STATUSES } from "@/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MissionWithLogement = Intervention & {
  logement: { id: string; name: string; address: string; city: string } | null;
};

export interface PrestataireDashboardStats {
  /** Missions dont la date est aujourd'hui (acceptée ou en cours) */
  missionsAujourdhui: MissionWithLogement[];
  /** Missions en attente de réponse du prestataire (status = assignee) */
  missionsEnAttente: MissionWithLogement[];
  /** Missions acceptées cette semaine (hors aujourd'hui) */
  missionsASemaine: MissionWithLogement[];
  /** Somme des prix_prestataire_ht des missions terminées ce mois */
  revenusduMois: number;
}

// ─── Helpers de dates ─────────────────────────────────────────────────────────

// IMPORTANT : utilise les composantes locales (getFullYear/getMonth/getDate)
// et NON pas toISOString() qui retourne l'heure UTC.
// Ex. en UTC+1 à minuit : toISOString() donnerait "2026-03-06" au lieu de "2026-03-07".
function toDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateRanges() {
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = toDateStr(today);

  // Fin de semaine = dimanche prochain (ou samedi selon convention : on prend 7 jours)
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  const weekEndStr = toDateStr(weekEnd);

  // Début et fin de mois courant
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    todayStr,
    tomorrowStr: toDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)),
    weekEndStr,
    monthStartStr: toDateStr(monthStart),
    monthEndStr: toDateStr(monthEnd),
  };
}

// ─── Hook : statistiques dashboard prestataire ────────────────────────────────

/**
 * Charge toutes les données nécessaires au dashboard prestataire.
 * Fait 2 requêtes ciblées pour éviter de charger trop de données.
 *
 * @param prestataireId - l'id de l'utilisateur connecté (auth.uid)
 */
export function usePrestataireDashboard(prestataireId: string | null) {
  return useQuery<PrestataireDashboardStats>({
    queryKey: ["prestataire-dashboard", prestataireId],
    enabled: !!prestataireId,
    queryFn: async () => {
      const {
        todayStr,
        tomorrowStr,
        weekEndStr,
        monthStartStr,
        monthEndStr,
      } = getDateRanges();

      // Requête 1 : missions actives (non terminées, non annulées) à venir
      const { data: actives, error: errActives } = await supabase
        .from("interventions")
        .select(
          `*, logement:logements!interventions_logement_id_fkey(id, name, address, city)`
        )
        .eq("prestataire_id", prestataireId as string)
        .not("status", "in", `(${INTERVENTION_STATUSES.TERMINEE},${INTERVENTION_STATUSES.ANNULEE},${INTERVENTION_STATUSES.REFUSEE})`)
        .gte("date", todayStr)
        .order("date", { ascending: true });

      if (errActives) throw errActives;

      // Requête 2 : missions terminées ce mois (pour revenus)
      const { data: terminees, error: errTerminees } = await supabase
        .from("interventions")
        .select("prix_prestataire_ht")
        .eq("prestataire_id", prestataireId as string)
        .eq("status", INTERVENTION_STATUSES.TERMINEE)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);

      if (errTerminees) throw errTerminees;

      const missions = (actives ?? []) as MissionWithLogement[];

      // Calculs côté client
      const missionsAujourdhui = missions.filter(
        (m) => m.date === todayStr
      );

      const missionsEnAttente = missions.filter(
        (m) => m.status === INTERVENTION_STATUSES.ASSIGNEE
      );

      const missionsASemaine = missions.filter(
        (m) =>
          m.date >= tomorrowStr &&
          m.date <= weekEndStr &&
          (m.status === INTERVENTION_STATUSES.ACCEPTEE ||
            m.status === INTERVENTION_STATUSES.ASSIGNEE)
      );

      const revenusduMois = (terminees ?? []).reduce(
        (sum, m) => sum + (m.prix_prestataire_ht ?? 0),
        0
      );

      return {
        missionsAujourdhui,
        missionsEnAttente,
        missionsASemaine,
        revenusduMois,
      };
    },
  });
}

// ─── Hook : liste complète des missions prestataire ───────────────────────────

export interface MissionFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Liste paginée/filtrée de toutes les missions d'un prestataire.
 * Triée par date décroissante.
 */
export function useMissionsPrestataire(
  prestataireId: string | null,
  filters: MissionFilters = {}
) {
  const { status, dateFrom, dateTo } = filters;

  return useQuery<MissionWithLogement[]>({
    queryKey: ["missions-prestataire", prestataireId, filters],
    enabled: !!prestataireId,
    queryFn: async () => {
      let query = supabase
        .from("interventions")
        .select(
          `*, logement:logements!interventions_logement_id_fkey(id, name, address, city)`
        )
        .eq("prestataire_id", prestataireId as string)
        .order("date", { ascending: false });

      if (status)   query = query.eq("status", status);
      if (dateFrom) query = query.gte("date", dateFrom);
      if (dateTo)   query = query.lte("date", dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MissionWithLogement[];
    },
  });
}

// ─── Hook : accepter une mission (RPC) ───────────────────────────────────────

/**
 * Appelle la RPC `accepter_intervention`.
 * Met à jour status → 'acceptee'.
 */
export function useAccepterMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interventionId: string) => {
      const { data, error } = await supabase.rpc("accepter_intervention", {
        p_intervention_id: interventionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prestataire-dashboard"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["missions-prestataire"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["mission-detail"], refetchType: "all" });
    },
  });
}

// ─── Hook : refuser une mission (RPC) ────────────────────────────────────────

/**
 * Appelle la RPC `refuser_intervention`.
 * Met à jour status → 'a_attribuer', prestataire_id → null,
 * et ajoute l'UUID du prestataire dans refused_by[].
 */
export function useRefuserMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interventionId: string) => {
      const { data, error } = await supabase.rpc("refuser_intervention", {
        p_intervention_id: interventionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prestataire-dashboard"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["missions-prestataire"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["mission-detail"], refetchType: "all" });
    },
  });
}

// ─── Hook : détail d'une mission (vue prestataire) ────────────────────────────

// Type enrichi : uniquement les champs utiles au prestataire
export type MissionDetail = Intervention & {
  logement: {
    id: string;
    name: string;
    address: string;
    city: string;
    postal_code: string;
    instructions: string | null;
    access_code: string | null;
  } | null;
};

/**
 * Charge le détail d'une mission pour la vue prestataire.
 * La RLS garantit qu'un prestataire ne peut voir que ses propres missions.
 */
export function useMissionDetail(id: string) {
  return useQuery<MissionDetail>({
    queryKey: ["mission-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select(
          `*,
          logement:logements!interventions_logement_id_fkey(
            id, name, address, city, postal_code, instructions, access_code
          )`
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as MissionDetail;
    },
  });
}
