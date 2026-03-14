"use client";

// Liste des interventions du client connecté.
// Filtrage par onglet : Toutes / À venir / En cours / Terminées.
// Cliquer sur une ligne → détail lecture seule.
// Sécurité : clientId toujours injecté explicitement (+ RLS Supabase).

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInterventions } from "@/lib/hooks/useInterventions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";
import type { InterventionWithRelations } from "@/lib/hooks/useInterventions";
import { useState } from "react";

// ─── Statut simplifié côté client ─────────────────────────────────────────────

const CLIENT_STATUS_MAP: Record<InterventionStatus, { label: string; className: string }> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: { label: "À venir",  className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.ASSIGNEE]:    { label: "À venir",  className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.ACCEPTEE]:    { label: "À venir",  className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.REFUSEE]:     { label: "À venir",  className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.EN_COURS]:    { label: "En cours", className: "bg-amber-50 text-amber-700 border-amber-200" },
  [INTERVENTION_STATUSES.TERMINEE]:    { label: "Terminée", className: "bg-green-50 text-green-700 border-green-200" },
  [INTERVENTION_STATUSES.ANNULEE]:     { label: "Annulée",  className: "bg-slate-50 text-slate-400 border-slate-200" },
};

function ClientStatusBadge({ status }: { status: string }) {
  const config = CLIENT_STATUS_MAP[status as InterventionStatus];
  if (!config) return null;
  return (
    <Badge variant="outline" className={`text-xs border whitespace-nowrap ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

// Groupe les statuts DB derrière les 3 onglets client
type ClientTab = "toutes" | "a_venir" | "en_cours" | "terminees";

const A_VENIR_STATUSES: InterventionStatus[] = [
  INTERVENTION_STATUSES.A_ATTRIBUER,
  INTERVENTION_STATUSES.ASSIGNEE,
  INTERVENTION_STATUSES.ACCEPTEE,
  INTERVENTION_STATUSES.REFUSEE,
];

function filterByTab(
  interventions: InterventionWithRelations[],
  tab: ClientTab
): InterventionWithRelations[] {
  switch (tab) {
    case "a_venir":
      return interventions.filter((i) =>
        A_VENIR_STATUSES.includes(i.status as InterventionStatus)
      );
    case "en_cours":
      return interventions.filter((i) => i.status === INTERVENTION_STATUSES.EN_COURS);
    case "terminees":
      return interventions.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE);
    default:
      // "Toutes" = tout sauf annulées
      return interventions.filter((i) => i.status !== INTERVENTION_STATUSES.ANNULEE);
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientInterventionsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ClientTab>("toutes");

  const { data: allInterventions, isLoading, error } = useInterventions({
    clientId: user?.id,
  });

  const interventions = filterByTab(allInterventions ?? [], tab);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes interventions</h1>
        <div className="text-sm text-muted-foreground mt-1">
          {isLoading ? (
            <Skeleton className="inline-block h-4 w-32" />
          ) : (
            `${interventions.length} intervention${interventions.length > 1 ? "s" : ""}`
          )}
        </div>
      </div>

      {/* Filtres onglets */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ClientTab)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="toutes">Toutes</TabsTrigger>
          <TabsTrigger value="a_venir">À venir</TabsTrigger>
          <TabsTrigger value="en_cours">En cours</TabsTrigger>
          <TabsTrigger value="terminees">Terminées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur lors du chargement des interventions.
        </div>
      ) : !interventions.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune intervention dans cet onglet.
        </div>
      ) : (
        <div className="space-y-2">
          {interventions.map((intervention) => (
            <Link
              key={intervention.id}
              href={`/client/interventions/${intervention.id}`}
              className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
            >
              {/* Infos */}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {intervention.logement?.name ?? "Logement inconnu"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(intervention.date)}
                  {" · "}
                  {TYPE_LABELS[intervention.type] ?? intervention.type}
                  {intervention.logement?.city ? ` · ${intervention.logement.city}` : ""}
                </div>
                <div className="mt-1.5">
                  <ClientStatusBadge status={intervention.status} />
                </div>
              </div>

              {/* Flèche */}
              <ChevronRight className="size-4 text-muted-foreground ml-3 flex-shrink-0 group-hover:text-blue-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
