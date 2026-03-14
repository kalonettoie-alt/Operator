"use client";

// Calendrier mensuel des interventions du client — lecture seule.
// Chips de logement dans chaque cellule (style V2).
// Filtre par logement + navigation mois précédent/suivant.

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInterventions } from "@/lib/hooks/useInterventions";
import { useLogements } from "@/lib/hooks/useLogements";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";
import type { InterventionWithRelations } from "@/lib/hooks/useInterventions";

// ─── Couleurs des chips par statut ────────────────────────────────────────────

const CHIP_CLASS: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "bg-indigo-50 text-indigo-700",
  [INTERVENTION_STATUSES.ASSIGNEE]:    "bg-indigo-50 text-indigo-700",
  [INTERVENTION_STATUSES.ACCEPTEE]:    "bg-indigo-50 text-indigo-700",
  [INTERVENTION_STATUSES.REFUSEE]:     "bg-slate-100 text-slate-400",
  [INTERVENTION_STATUSES.EN_COURS]:    "bg-amber-50 text-amber-700",
  [INTERVENTION_STATUSES.TERMINEE]:    "bg-green-50 text-green-700",
  [INTERVENTION_STATUSES.ANNULEE]:     "bg-slate-100 text-slate-400 line-through",
};

const CLIENT_STATUS_LABEL: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "À venir",
  [INTERVENTION_STATUSES.ASSIGNEE]:    "À venir",
  [INTERVENTION_STATUSES.ACCEPTEE]:    "À venir",
  [INTERVENTION_STATUSES.REFUSEE]:     "À venir",
  [INTERVENTION_STATUSES.EN_COURS]:    "En cours",
  [INTERVENTION_STATUSES.TERMINEE]:    "Terminée",
  [INTERVENTION_STATUSES.ANNULEE]:     "Annulée",
};

const CLIENT_STATUS_BADGE: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "bg-slate-100 text-slate-700 border-slate-200",
  [INTERVENTION_STATUSES.ASSIGNEE]:    "bg-slate-100 text-slate-700 border-slate-200",
  [INTERVENTION_STATUSES.ACCEPTEE]:    "bg-slate-100 text-slate-700 border-slate-200",
  [INTERVENTION_STATUSES.REFUSEE]:     "bg-slate-100 text-slate-700 border-slate-200",
  [INTERVENTION_STATUSES.EN_COURS]:    "bg-amber-50 text-amber-700 border-amber-200",
  [INTERVENTION_STATUSES.TERMINEE]:    "bg-green-50 text-green-700 border-green-200",
  [INTERVENTION_STATUSES.ANNULEE]:     "bg-slate-50 text-slate-400 border-slate-200",
};

// ─── Helpers calendrier ────────────────────────────────────────────────────────

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

const MAX_CHIPS = 2; // nombre max de chips visibles par cellule

function premierLundiGrille(annee: number, mois: number): Date {
  const premierJour = new Date(annee, mois, 1);
  const jourSemaine = (premierJour.getDay() + 6) % 7;
  const debut = new Date(premierJour);
  debut.setDate(1 - jourSemaine);
  return debut;
}

function genererCases(annee: number, mois: number): Date[] {
  const debut = premierLundiGrille(annee, mois);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

function bornesMois(annee: number, mois: number) {
  return {
    dateFrom: toDateStr(new Date(annee, mois, 1)),
    dateTo:   toDateStr(new Date(annee, mois + 1, 0)),
  };
}

/** Tronque un nom de logement pour l'affichage en chip */
function truncate(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientCalendrierPage() {
  const { user } = useAuth();

  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois]   = useState(today.getMonth());
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const [filtreLogement, setFiltreLogement]   = useState<string>("all");

  const { dateFrom, dateTo } = bornesMois(annee, mois);

  const { data: allInterventions, isLoading } = useInterventions({
    clientId: user?.id,
    dateFrom,
    dateTo,
  });

  const { data: logements } = useLogements(user?.id);

  // Application du filtre logement côté client
  const interventions = useMemo(() => {
    if (!allInterventions) return [];
    if (filtreLogement === "all") return allInterventions;
    return allInterventions.filter((i) => i.logement_id === filtreLogement);
  }, [allInterventions, filtreLogement]);

  // Index dateStr → interventions
  const parJour = useMemo(() => {
    const index: Record<string, InterventionWithRelations[]> = {};
    for (const i of interventions) {
      const d = i.date.slice(0, 10);
      if (!index[d]) index[d] = [];
      index[d].push(i);
    }
    return index;
  }, [interventions]);

  const cases   = useMemo(() => genererCases(annee, mois), [annee, mois]);
  const todayStr = toDateStr(today);

  // Navigation mois
  function precedent() {
    setJourSelectionne(null);
    if (mois === 0) { setMois(11); setAnnee((a) => a - 1); }
    else setMois((m) => m - 1);
  }
  function suivant() {
    setJourSelectionne(null);
    if (mois === 11) { setMois(0); setAnnee((a) => a + 1); }
    else setMois((m) => m + 1);
  }
  function goToday() {
    setJourSelectionne(null);
    setAnnee(today.getFullYear());
    setMois(today.getMonth());
  }

  const titreMois = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(annee, mois, 1));

  const interventionsJour = jourSelectionne ? (parJour[jourSelectionne] ?? []) : [];

  // Résumé mois (hors annulées)
  const nbMois       = interventions.filter((i) => i.status !== INTERVENTION_STATUSES.ANNULEE).length;
  const nbTerminees  = interventions.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE).length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">

      {/* ── En-tête : titre + filtre + navigation ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Titre + nav */}
        <div className="flex items-center gap-1 flex-1">
          <Button variant="ghost" size="icon" onClick={precedent} aria-label="Mois précédent">
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 capitalize min-w-[180px] text-center">
            {titreMois}
          </h1>
          <Button variant="ghost" size="icon" onClick={suivant} aria-label="Mois suivant">
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="text-xs px-2 ml-1"
          >
            Aujourd&apos;hui
          </Button>
        </div>

        {/* Filtre logement */}
        <div className="sm:w-52">
          <select
            value={filtreLogement}
            onChange={(e) => { setFiltreLogement(e.target.value); setJourSelectionne(null); }}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filtrer par logement"
          >
            <option value="all">Tous les logements</option>
            {(logements ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Grille calendrier ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white overflow-hidden">

        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {JOURS.map((j) => (
            <div key={j} className="py-2.5 text-center text-xs font-semibold text-muted-foreground">
              {j}
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="grid grid-cols-7">
          {isLoading
            ? Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="min-h-[80px] border-b border-r p-1.5">
                  <Skeleton className="h-5 w-5 rounded mb-1" />
                  <Skeleton className="h-4 w-14 rounded" />
                </div>
              ))
            : cases.map((date) => {
                const dateStr = toDateStr(date);
                const estMoisCourant = date.getMonth() === mois;
                const estAujourdhui  = dateStr === todayStr;
                const estSelectionne = dateStr === jourSelectionne;
                const items          = parJour[dateStr] ?? [];
                const visible        = items.slice(0, MAX_CHIPS);
                const surplus        = items.length - MAX_CHIPS;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setJourSelectionne(estSelectionne ? null : dateStr)}
                    className={[
                      "min-h-[80px] border-b border-r last:border-r-0 p-1.5 text-left align-top transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400",
                      estSelectionne
                        ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                        : items.length > 0
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    {/* Numéro du jour */}
                    <span
                      className={[
                        "inline-flex items-center justify-center size-6 rounded-full text-xs font-semibold mb-1",
                        estAujourdhui
                          ? "bg-blue-600 text-white"
                          : estMoisCourant
                          ? "text-gray-800"
                          : "text-gray-300",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </span>

                    {/* Chips logement */}
                    <div className="space-y-0.5">
                      {visible.map((i) => (
                        <div
                          key={i.id}
                          className={[
                            "rounded px-1 py-0.5 text-[10px] font-medium leading-tight truncate w-full",
                            CHIP_CLASS[i.status as InterventionStatus] ?? "bg-indigo-50 text-indigo-700",
                          ].join(" ")}
                          title={i.logement?.name ?? "Logement inconnu"}
                        >
                          {truncate(i.logement?.name ?? "?", 11)}
                        </div>
                      ))}
                      {surplus > 0 && (
                        <p className="text-[10px] text-muted-foreground pl-0.5">
                          +{surplus} autre{surplus > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      {/* ── Légende ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-indigo-50 border border-indigo-200" />
          À venir
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-amber-50 border border-amber-200" />
          En cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-green-50 border border-green-200" />
          Terminée
        </span>
      </div>

      {/* ── Panneau jour sélectionné ─────────────────────────────────────── */}
      {jourSelectionne && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 capitalize">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(jourSelectionne + "T12:00:00"))}
          </h2>

          {interventionsJour.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <CalendarDays className="size-4" />
              Aucune intervention ce jour.
            </div>
          ) : (
            <div className="space-y-2">
              {interventionsJour.map((intervention) => (
                <Link
                  key={intervention.id}
                  href={`/client/interventions/${intervention.id}`}
                  className="flex items-center justify-between rounded-xl border bg-white p-3.5 shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {intervention.logement?.name ?? "Logement inconnu"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_LABELS[intervention.type] ?? intervention.type}
                      {intervention.logement?.city ? ` · ${intervention.logement.city}` : ""}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs border ${CLIENT_STATUS_BADGE[intervention.status as InterventionStatus] ?? ""}`}
                    >
                      {CLIENT_STATUS_LABEL[intervention.status as InterventionStatus] ?? intervention.status}
                    </Badge>
                    <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Résumé du mois ───────────────────────────────────────────────── */}
      {!isLoading && nbMois > 0 && !jourSelectionne && (
        <div className="rounded-xl bg-gray-50 border px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-gray-700">{nbMois}</span>{" "}
          intervention{nbMois > 1 ? "s" : ""} ce mois
          {" · "}
          <span className="font-medium text-green-700">{nbTerminees}</span>{" "}
          terminée{nbTerminees > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
