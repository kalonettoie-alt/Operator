// lib/hooks/useDashboardStats.ts
// Données agrégées pour le dashboard admin.
// Deux requêtes : interventions du mois courant + prochaines interventions.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import {
  calculateMonthlyRevenue,
  calculateMonthlyProviderCost,
  calculateMonthlyBlanchisserie,
  calculateMonthlyGain,
} from "@/lib/utils/finance";
import type { Intervention } from "@/types/database";
import { INTERVENTION_STATUSES } from "@/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type InterventionRow = Intervention & {
  logement: { id: string; name: string; city: string } | null;
  client: { id: string; full_name: string } | null;
  prestataire: { id: string; full_name: string } | null;
};

// ─── Helpers dates ────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=dim, 1=lun, ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  const today = toISODate(new Date());
  const { start: monthStart, end: monthEnd } = getMonthBounds();
  const { start: weekStart, end: weekEnd } = getWeekBounds();

  // Interventions du mois courant (pour les KPIs financiers + compteurs)
  const monthly = useQuery<InterventionRow[]>({
    queryKey: ["dashboard", "monthly", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select(`
          *,
          logement:logements!interventions_logement_id_fkey(id, name, city),
          client:profiles!interventions_client_id_fkey(id, full_name),
          prestataire:profiles!interventions_prestataire_id_fkey(id, full_name)
        `)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as InterventionRow[];
    },
  });

  // Prochaines interventions (aujourd'hui + futur, max 10)
  const upcoming = useQuery<InterventionRow[]>({
    queryKey: ["dashboard", "upcoming", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select(`
          *,
          logement:logements!interventions_logement_id_fkey(id, name, city),
          client:profiles!interventions_client_id_fkey(id, full_name),
          prestataire:profiles!interventions_prestataire_id_fkey(id, full_name)
        `)
        .gte("date", today)
        .neq("status", INTERVENTION_STATUSES.ANNULEE)
        .order("date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data as InterventionRow[];
    },
  });

  // KPIs calculés client-side depuis les données du mois
  const monthlyData = monthly.data ?? [];

  const kpis = {
    // Compteurs
    countToday: monthlyData.filter((i) => i.date === today).length,
    countWeek: monthlyData.filter((i) => i.date >= weekStart && i.date <= weekEnd).length,
    countMonth: monthlyData.filter((i) => i.status !== INTERVENTION_STATUSES.ANNULEE).length,
    countAAttribuer: monthlyData.filter((i) => i.status === INTERVENTION_STATUSES.A_ATTRIBUER).length,
    countEnCours: monthlyData.filter((i) => i.status === INTERVENTION_STATUSES.EN_COURS).length,
    countTerminees: monthlyData.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE).length,

    // Financiers
    revenue: calculateMonthlyRevenue(monthlyData),
    providerCost: calculateMonthlyProviderCost(monthlyData),
    blanchisserie: calculateMonthlyBlanchisserie(monthlyData),
    gain: calculateMonthlyGain(monthlyData),
  };

  return {
    monthly,
    upcoming,
    kpis,
    isLoading: monthly.isLoading || upcoming.isLoading,
    error: monthly.error || upcoming.error,
  };
}
