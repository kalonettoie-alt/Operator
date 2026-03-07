// lib/hooks/useMissionsPrestataire.ts
// Hooks TanStack Query pour l'espace prestataire.
// Toutes les requêtes filtrent sur l'id du prestataire connecté.
// La RLS Supabase constitue un second garde-fou côté serveur.

import { useQuery } from "@tanstack/react-query";
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

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
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
