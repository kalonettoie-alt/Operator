"use client";

// Historique des interventions terminées du client — lecture seule.
// Filtres : logement (select) + période (3 / 6 / 12 mois).
// Affiche le total facturé sur la période filtrée.

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInterventions } from "@/lib/hooks/useInterventions";
import { useLogements } from "@/lib/hooks/useLogements";
import { Skeleton } from "@/components/ui/skeleton";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionWithRelations } from "@/lib/hooks/useInterventions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

const PERIODES = [
  { value: "3",  label: "3 derniers mois" },
  { value: "6",  label: "6 derniers mois" },
  { value: "12", label: "12 derniers mois" },
  { value: "all", label: "Tout l'historique" },
] as const;

type Periode = (typeof PERIODES)[number]["value"];

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatEuros(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function prixTotal(i: InterventionWithRelations): number {
  return (
    (i.prix_client_ttc ?? 0) +
    (i.blanchisserie_incluse ? (i.prix_blanchisserie ?? 0) : 0)
  );
}

/** Calcule dateFrom pour X mois en arrière depuis aujourd'hui */
function dateFromMois(nbMois: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - nbMois);
  return d.toISOString().slice(0, 10);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientHistoriquePage() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState<Periode>("6");
  const [logementId, setLogementId] = useState<string>("all");

  // Calcul des bornes de dates selon la période
  const dateFrom = periode !== "all" ? dateFromMois(Number(periode)) : undefined;

  const { data: interventions, isLoading, error } = useInterventions({
    clientId: user?.id,
    status: INTERVENTION_STATUSES.TERMINEE,
    dateFrom,
  });

  const { data: logements } = useLogements(user?.id);

  // Filtre côté client par logement
  const filtered = useMemo(() => {
    if (!interventions) return [];
    if (logementId === "all") return interventions;
    return interventions.filter((i) => i.logement_id === logementId);
  }, [interventions, logementId]);

  // Total facturé sur la sélection
  const totalPeriode = useMemo(
    () => filtered.reduce((sum, i) => sum + prixTotal(i), 0),
    [filtered]
  );

  // Groupement par mois pour affichage en sections
  const parMois = useMemo(() => {
    const groupes: { cle: string; label: string; items: InterventionWithRelations[] }[] = [];
    const seen = new Map<string, InterventionWithRelations[]>();

    for (const i of filtered) {
      const d = new Date(i.date);
      const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
      }).format(d);
      if (!seen.has(cle)) {
        seen.set(cle, []);
        groupes.push({ cle, label, items: seen.get(cle)! });
      }
      seen.get(cle)!.push(i);
    }
    return groupes;
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interventions terminées
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Filtre période */}
        <div className="flex-1 min-w-0">
          <label htmlFor="filtre-periode" className="text-xs text-muted-foreground block mb-1">
            Période
          </label>
          <select
            id="filtre-periode"
            value={periode}
            onChange={(e) => setPeriode(e.target.value as Periode)}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PERIODES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Filtre logement */}
        <div className="flex-1 min-w-0">
          <label htmlFor="filtre-logement" className="text-xs text-muted-foreground block mb-1">
            Logement
          </label>
          <select
            id="filtre-logement"
            value={logementId}
            onChange={(e) => setLogementId(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Tous les logements</option>
            {(logements ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur lors du chargement de l&apos;historique.
        </div>
      )}

      {/* Vide */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <History className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune intervention terminée sur cette période.
          </p>
        </div>
      )}

      {/* Liste groupée par mois */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-5">
          {parMois.map(({ cle, label, items }) => {
            const totalMois = items.reduce((sum, i) => sum + prixTotal(i), 0);

            return (
              <section key={cle}>
                {/* En-tête de mois */}
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700 capitalize">{label}</h2>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatEuros(totalMois)}
                  </span>
                </div>

                {/* Interventions du mois */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="divide-y">
                    {items.map((intervention) => (
                      <Link
                        key={intervention.id}
                        href={`/client/interventions/${intervention.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {intervention.logement?.name ?? "Logement inconnu"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(intervention.date)}
                            {" · "}
                            {TYPE_LABELS[intervention.type] ?? intervention.type}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium text-gray-700 tabular-nums">
                            {intervention.prix_client_ttc != null
                              ? formatEuros(prixTotal(intervention))
                              : "—"}
                          </span>
                          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}

          {/* Total global de la période */}
          <div className="rounded-xl border bg-blue-50 border-blue-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Total période</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} intervention{filtered.length > 1 ? "s" : ""} terminée{filtered.length > 1 ? "s" : ""}
              </p>
            </div>
            <span className="text-lg font-bold text-blue-700 tabular-nums">
              {formatEuros(totalPeriode)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
