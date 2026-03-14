"use client";

// Historique prestataire — missions passées (terminées, annulées, refusées).
// Filtres : statut, plage de dates.
// Triées par date décroissante. Clic → détail de la mission.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { History, ChevronRight } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { useMissionsPrestataire } from "@/lib/hooks/useMissionsPrestataire";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { INTERVENTION_STATUSES, type InterventionStatus } from "@/types/enums";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
    year:    "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const TYPE_LABELS: Record<string, string> = {
  menage:      "Ménage",
  etat_lieux:  "État des lieux",
  maintenance: "Maintenance",
};

// Statuts considérés comme "historique" pour le prestataire
const STATUTS_PASSE: InterventionStatus[] = [
  INTERVENTION_STATUSES.TERMINEE,
  INTERVENTION_STATUSES.ANNULEE,
  INTERVENTION_STATUSES.REFUSEE,
];

const STATUTS_OPTIONS = [
  { value: "",                             label: "Tous" },
  { value: INTERVENTION_STATUSES.TERMINEE, label: "Terminées" },
  { value: INTERVENTION_STATUSES.ANNULEE,  label: "Annulées" },
  { value: INTERVENTION_STATUSES.REFUSEE,  label: "Refusées" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrestataireHistoriquePage() {
  const router = useRouter();
  const { user } = useAuth();

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filtreStatut, setFiltreStatut] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState(todayStr());

  // ── Données ───────────────────────────────────────────────────────────────
  // Toutes les missions jusqu'à aujourd'hui (les missions futures sont dans /planning)
  const { data: missions, isLoading } = useMissionsPrestataire(
    user?.id ?? null,
    {
      dateFrom: dateFrom || undefined,
      dateTo:   dateTo   || undefined,
    }
  );

  // ── Filtrage statut côté client ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = missions ?? [];
    // Sans filtre → statuts passés uniquement
    if (!filtreStatut) {
      return list.filter((m) =>
        STATUTS_PASSE.includes(m.status as InterventionStatus)
      );
    }
    return list.filter((m) => m.status === filtreStatut);
  }, [missions, filtreStatut]);

  // ── Revenus totaux (missions terminées uniquement) ────────────────────────
  const totalRevenus = useMemo(() =>
    filtered
      .filter((m) => m.status === INTERVENTION_STATUSES.TERMINEE)
      .reduce((sum, m) => sum + (m.prix_prestataire_ht ?? 0), 0)
  , [filtered]);

  const nbTerminees = filtered.filter((m) => m.status === INTERVENTION_STATUSES.TERMINEE).length;

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <History className="size-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon historique</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Chargement…" : `${filtered.length} mission${filtered.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* ── Résumé revenus ──────────────────────────────────────────────── */}
      {!isLoading && nbTerminees > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium">Revenus sur la période</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatPrix(totalRevenus)}</p>
          </div>
          <div className="bg-slate-50 border rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">Missions terminées</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{nbTerminees}</p>
          </div>
        </div>
      )}

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white rounded-xl border p-3 shadow-sm">
        {/* Statut pills */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Statut</span>
          <div className="flex flex-wrap gap-1.5">
            {STATUTS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFiltreStatut(o.value)}
                className={[
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  filtreStatut === o.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300",
                ].join(" ")}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="flex flex-col gap-1">
          <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground">Du</label>
          <input
            id="date-from" type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground">Au</label>
          <input
            id="date-to" type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* ── Liste des missions ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium text-gray-700">Aucune mission dans l&apos;historique</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vos missions termin&eacute;es appara&icirc;tront ici
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
              onClick={() => router.push(`/prestataire/missions/${m.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Date */}
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDate(m.date)}
                    </p>
                    {/* Logement */}
                    <p className="font-semibold text-sm truncate">
                      {m.logement?.name ?? "Logement inconnu"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.logement?.city ?? ""}
                    </p>
                    {/* Type + prix */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-amber-600 font-medium">
                        ⚡ {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                      {m.status === INTERVENTION_STATUSES.TERMINEE && m.prix_prestataire_ht != null && (
                        <span className="text-xs font-semibold text-green-700">
                          {formatPrix(m.prix_prestataire_ht)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={m.status as InterventionStatus} />
                    <ChevronRight className="size-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
