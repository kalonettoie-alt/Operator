// lib/hooks/useClientDashboard.ts
// Données agrégées pour le dashboard client.
// Toutes les requêtes sont filtrées par client_id — un client ne voit que ses propres données.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { calculateClientMonthlyBilling } from "@/lib/utils/finance";
import type { Intervention } from "@/types/database";
import { INTERVENTION_STATUSES } from "@/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientInterventionRow = Intervention & {
  logement: { id: string; name: string; city: string } | null;
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

export function useClientDashboard(clientId: string | undefined) {
  const today = toISODate(new Date());
  const { start: monthStart, end: monthEnd } = getMonthBounds();
  const { start: weekStart, end: weekEnd } = getWeekBounds();

  // Interventions du mois courant — base pour les KPIs et la facturation
  const monthly = useQuery<ClientInterventionRow[]>({
    queryKey: ["client-dashboard", "monthly", clientId, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select(`
          *,
          logement:logements!interventions_logement_id_fkey(id, name, city)
        `)
        .eq("client_id", clientId!)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as ClientInterventionRow[];
    },
    enabled: !!clientId,
  });

  // Prochaines interventions (aujourd'hui + futur, non annulées) — max 10
  const upcoming = useQuery<ClientInterventionRow[]>({
    queryKey: ["client-dashboard", "upcoming", clientId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select(`
          *,
          logement:logements!interventions_logement_id_fkey(id, name, city)
        `)
        .eq("client_id", clientId!)
        .gte("date", today)
        .neq("status", INTERVENTION_STATUSES.ANNULEE)
        .order("date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data as ClientInterventionRow[];
    },
    enabled: !!clientId,
  });

  // KPIs calculés client-side depuis les données du mois
  const monthlyData = monthly.data ?? [];

  const kpis = {
    // Compteurs (interventions non annulées)
    countToday: monthlyData.filter(
      (i) => i.date === today && i.status !== INTERVENTION_STATUSES.ANNULEE
    ).length,
    countWeek: monthlyData.filter(
      (i) =>
        i.date >= weekStart &&
        i.date <= weekEnd &&
        i.status !== INTERVENTION_STATUSES.ANNULEE
    ).length,
    countMonth: monthlyData.filter(
      (i) => i.status !== INTERVENTION_STATUSES.ANNULEE
    ).length,
    countTerminees: monthlyData.filter(
      (i) => i.status === INTERVENTION_STATUSES.TERMINEE
    ).length,

    // Facture mensuelle estimée = interventions terminées seulement
    billEstimate: calculateClientMonthlyBilling(monthlyData),
  };

  return {
    monthly,
    upcoming,
    kpis,
    isLoading: monthly.isLoading || upcoming.isLoading,
    error: monthly.error || upcoming.error,
  };
}
