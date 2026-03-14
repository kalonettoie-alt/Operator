"use client";

// Calendrier mensuel des interventions du client — lecture seule.
// Navigation mois précédent/suivant. Cliquer sur un jour affiche les interventions.
// Pas de librairie externe — grille CSS native.

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChevronRight as Arrow,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInterventions } from "@/lib/hooks/useInterventions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";
import type { InterventionWithRelations } from "@/lib/hooks/useInterventions";

// ─── Statut simplifié ──────────────────────────────────────────────────────────

const STATUS_DOT: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "bg-slate-400",
  [INTERVENTION_STATUSES.ASSIGNEE]:    "bg-slate-400",
  [INTERVENTION_STATUSES.ACCEPTEE]:    "bg-blue-400",
  [INTERVENTION_STATUSES.REFUSEE]:     "bg-slate-400",
  [INTERVENTION_STATUSES.EN_COURS]:    "bg-amber-400",
  [INTERVENTION_STATUSES.TERMINEE]:    "bg-green-500",
  [INTERVENTION_STATUSES.ANNULEE]:     "bg-slate-300",
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

const CLIENT_STATUS_CLASS: Record<InterventionStatus, string> = {
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

/** Retourne le premier lundi de la grille (peut être du mois précédent) */
function premierLundiGrille(annee: number, mois: number): Date {
  const premierJour = new Date(annee, mois, 1);
  // getDay() : 0=dim, 1=lun... On veut lundi=0
  const jourSemaine = (premierJour.getDay() + 6) % 7; // 0=lun, 6=dim
  const debut = new Date(premierJour);
  debut.setDate(1 - jourSemaine);
  return debut;
}

/** Génère les 42 cases (6 semaines × 7 jours) pour la grille */
function genererCasesCalendrier(annee: number, mois: number): Date[] {
  const debut = premierLundiGrille(annee, mois);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    return d;
  });
}

/** Format YYYY-MM-DD depuis un objet Date (timezone locale) */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

/** Premier et dernier jour d'un mois au format YYYY-MM-DD */
function bornesMois(annee: number, mois: number): { dateFrom: string; dateTo: string } {
  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 0);
  return { dateFrom: toDateStr(debut), dateTo: toDateStr(fin) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientCalendrierPage() {
  const { user } = useAuth();

  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois] = useState(today.getMonth()); // 0-indexed
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);

  const { dateFrom, dateTo } = bornesMois(annee, mois);

  const { data: interventions, isLoading } = useInterventions({
    clientId: user?.id,
    dateFrom,
    dateTo,
  });

  // Index : dateStr → liste d'interventions
  const parJour = useMemo(() => {
    const index: Record<string, InterventionWithRelations[]> = {};
    for (const i of interventions ?? []) {
      const d = i.date.slice(0, 10); // YYYY-MM-DD
      if (!index[d]) index[d] = [];
      index[d].push(i);
    }
    return index;
  }, [interventions]);

  const cases = useMemo(() => genererCasesCalendrier(annee, mois), [annee, mois]);

  const todayStr = toDateStr(today);

  // Navigation
  function moisPrecedent() {
    if (mois === 0) { setMois(11); setAnnee((a) => a - 1); }
    else setMois((m) => m - 1);
    setJourSelectionne(null);
  }

  function moisSuivant() {
    if (mois === 11) { setMois(0); setAnnee((a) => a + 1); }
    else setMois((m) => m + 1);
    setJourSelectionne(null);
  }

  const titreMois = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(annee, mois, 1));

  const interventionsJour = jourSelectionne ? (parJour[jourSelectionne] ?? []) : [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

      {/* En-tête + navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">{titreMois}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={moisPrecedent} aria-label="Mois précédent">
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAnnee(today.getFullYear()); setMois(today.getMonth()); setJourSelectionne(null); }}
            className="text-xs px-2"
          >
            Aujourd&apos;hui
          </Button>
          <Button variant="ghost" size="icon" onClick={moisSuivant} aria-label="Mois suivant">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Grille calendrier */}
      <div className="rounded-xl border bg-white overflow-hidden">

        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b">
          {JOURS.map((j) => (
            <div
              key={j}
              className="py-2 text-center text-xs font-semibold text-muted-foreground"
            >
              {j}
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="grid grid-cols-7">
          {isLoading
            ? Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="min-h-[52px] border-b border-r last:border-r-0 p-1">
                  <Skeleton className="h-5 w-5 rounded mx-auto" />
                </div>
              ))
            : cases.map((date) => {
                const dateStr = toDateStr(date);
                const estMoisCourant = date.getMonth() === mois;
                const estAujourdhui = dateStr === todayStr;
                const estSelectionne = dateStr === jourSelectionne;
                const interventionsDuJour = parJour[dateStr] ?? [];
                const aDesInterventions = interventionsDuJour.length > 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setJourSelectionne(estSelectionne ? null : dateStr)}
                    className={[
                      "min-h-[52px] border-b border-r last:border-r-0 p-1.5 text-left transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                      estSelectionne
                        ? "bg-blue-50"
                        : aDesInterventions
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    {/* Numéro du jour */}
                    <span
                      className={[
                        "flex items-center justify-center size-6 rounded-full text-xs font-medium mx-auto",
                        estAujourdhui
                          ? "bg-blue-600 text-white"
                          : estMoisCourant
                          ? "text-gray-800"
                          : "text-gray-300",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </span>

                    {/* Points d'intervention */}
                    {aDesInterventions && (
                      <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                        {interventionsDuJour.slice(0, 3).map((i) => (
                          <span
                            key={i.id}
                            className={`size-1.5 rounded-full ${STATUS_DOT[i.status as InterventionStatus] ?? "bg-gray-400"}`}
                          />
                        ))}
                        {interventionsDuJour.length > 3 && (
                          <span className="text-[9px] text-muted-foreground leading-none">
                            +{interventionsDuJour.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400" />À venir</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" />En cours</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-green-500" />Terminée</span>
      </div>

      {/* Panneau du jour sélectionné */}
      {jourSelectionne && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">
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
                      className={`text-xs border ${CLIENT_STATUS_CLASS[intervention.status as InterventionStatus] ?? ""}`}
                    >
                      {CLIENT_STATUS_LABEL[intervention.status as InterventionStatus] ?? intervention.status}
                    </Badge>
                    <Arrow className="size-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Résumé du mois */}
      {!isLoading && (interventions?.length ?? 0) > 0 && !jourSelectionne && (
        <div className="rounded-xl bg-gray-50 border p-3 text-sm text-muted-foreground">
          <span className="font-medium text-gray-700">
            {interventions?.filter((i) => i.status !== INTERVENTION_STATUSES.ANNULEE).length}
          </span>{" "}
          intervention{(interventions?.filter((i) => i.status !== INTERVENTION_STATUSES.ANNULEE).length ?? 0) > 1 ? "s" : ""} ce mois
          {" · "}
          <span className="font-medium text-green-700">
            {interventions?.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE).length}
          </span>{" "}
          terminée{(interventions?.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE).length ?? 0) > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
