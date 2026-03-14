"use client";

// Dashboard Client — Vue principale du client connecté.
// Affiche : KPIs du mois, facture estimée, prochaines interventions, récap terminées.
// Sécurité : toutes les requêtes sont filtrées par client_id (RLS Supabase + filtre explicite).

import { useAuth } from "@/lib/hooks/useAuth";
import { useClientDashboard, type ClientInterventionRow } from "@/lib/hooks/useClientDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CalendarRange, Euro, ListChecks } from "lucide-react";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";

// ─── Statut simplifié côté client ─────────────────────────────────────────────
// Le client voit 3 états seulement : "À venir", "En cours", "Terminée".
// Les statuts internes (à attribuer, assignée, refusée...) sont masqués.

const CLIENT_STATUS_MAP: Record<InterventionStatus, { label: string; className: string }> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: { label: "À venir",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.ASSIGNEE]:    { label: "À venir",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.ACCEPTEE]:    { label: "À venir",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.REFUSEE]:     { label: "À venir",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  [INTERVENTION_STATUSES.EN_COURS]:    { label: "En cours",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  [INTERVENTION_STATUSES.TERMINEE]:    { label: "Terminée",  className: "bg-green-50 text-green-700 border-green-200" },
  [INTERVENTION_STATUSES.ANNULEE]:     { label: "Annulée",   className: "bg-slate-50 text-slate-400 border-slate-200" },
};

function ClientStatusBadge({ status }: { status: string }) {
  const config = CLIENT_STATUS_MAP[status as InterventionStatus];
  if (!config) return null;
  return (
    <Badge variant="outline" className={`text-xs border ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Prix total facturé au client pour une intervention (ménage + blanchisserie)
function prixTotal(i: ClientInterventionRow): number {
  return (i.prix_client_ttc ?? 0) + (i.blanchisserie_incluse ? (i.prix_blanchisserie ?? 0) : 0);
}

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

// ─── Carte KPI ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  highlight?: boolean;
}

function KpiCard({ icon, label, value, loading, highlight }: KpiCardProps) {
  return (
    <Card className={highlight ? "border-blue-200 bg-blue-50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${highlight ? "text-blue-700" : "text-gray-900"}`}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const { user, profile } = useAuth();
  const { kpis, monthly, upcoming, isLoading, error } = useClientDashboard(user?.id);

  const moisCourant = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Interventions terminées ce mois (pour le récap facturation)
  const terminées = (monthly.data ?? []).filter(
    (i) => i.status === INTERVENTION_STATUSES.TERMINEE
  );

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Erreur lors du chargement du tableau de bord.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Résumé de vos interventions
        </p>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Aujourd'hui"
          value={`${kpis.countToday} intervention${kpis.countToday > 1 ? "s" : ""}`}
          loading={isLoading}
        />
        <KpiCard
          icon={<CalendarRange className="h-4 w-4" />}
          label="Cette semaine"
          value={`${kpis.countWeek} intervention${kpis.countWeek > 1 ? "s" : ""}`}
          loading={isLoading}
        />
        <KpiCard
          icon={<ListChecks className="h-4 w-4" />}
          label="Ce mois"
          value={`${kpis.countMonth} intervention${kpis.countMonth > 1 ? "s" : ""}`}
          loading={isLoading}
        />
        <KpiCard
          icon={<Euro className="h-4 w-4" />}
          label={`Facture estimée — ${moisCourant}`}
          value={formatEuros(kpis.billEstimate)}
          loading={isLoading}
          highlight
        />
      </div>

      {/* Note sous la facture estimée */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground -mt-2">
          {kpis.countTerminees > 0
            ? `* Calculée sur ${kpis.countTerminees} intervention${kpis.countTerminees > 1 ? "s" : ""} terminée${kpis.countTerminees > 1 ? "s" : ""} ce mois (ménage + blanchisserie). Facture définitive en fin de mois.`
            : "* Aucune intervention terminée ce mois — la facture estimée sera mise à jour à mesure des prestations."}
        </p>
      )}

      {/* Prochaines interventions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Prochaines interventions
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !upcoming.data?.length ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune intervention à venir.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.data.map((intervention) => (
              <div
                key={intervention.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {intervention.logement?.name ?? "Logement inconnu"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(intervention.date)}
                    {" · "}
                    {TYPE_LABELS[intervention.type] ?? intervention.type}
                    {intervention.logement?.city ? ` · ${intervention.logement.city}` : ""}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <ClientStatusBadge status={intervention.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Récap interventions terminées ce mois */}
      {!isLoading && terminées.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Interventions terminées ce mois
          </h2>
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="divide-y">
              {terminées.map((intervention) => (
                <div
                  key={intervention.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">
                      {intervention.logement?.name ?? "Logement inconnu"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(intervention.date)}
                      {" · "}
                      {TYPE_LABELS[intervention.type] ?? intervention.type}
                    </div>
                  </div>
                  <div className="ml-4 text-sm font-medium text-gray-700 flex-shrink-0">
                    {intervention.prix_client_ttc != null
                      ? formatEuros(prixTotal(intervention))
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
            {/* Total */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 font-semibold">
              <span className="text-sm text-gray-700">Total estimé</span>
              <span className="text-sm text-blue-700">{formatEuros(kpis.billEstimate)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
