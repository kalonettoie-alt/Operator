"use client";

// Dashboard Admin — KPIs du mois courant + prochaines interventions.

import Link from "next/link";
import { useDashboardStats } from "@/lib/hooks/useDashboardStats";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatPrix(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(dateStr));
}

function getCurrentMonthLabel(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// ─── Composant : KPI Card ─────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  highlight?: boolean;
}

function KpiCard({ label, value, sublabel, highlight }: KpiCardProps) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

// KPI spécial : compteur X/Y pour le jour
function TodayProgressCard({ done, total }: { done: number; total: number }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Aujourd&apos;hui
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums text-primary">
          <span>{done}</span>
          <span className="text-xl font-medium text-muted-foreground">/{total}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">terminées / à faire</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { kpis, upcoming, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Chargement&hellip;
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive text-sm">
        Erreur lors du chargement du dashboard.
      </div>
    );
  }

  const monthLabel = getCurrentMonthLabel();

  return (
    <div className="p-6 space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{monthLabel}</p>
      </div>

      {/* KPIs — compteurs */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Interventions
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <TodayProgressCard done={kpis.countTodayDone} total={kpis.countTodayTotal} />
          <KpiCard label="Cette semaine" value={kpis.countWeek} />
          <KpiCard label="Ce mois" value={kpis.countMonth} sublabel="hors annulées" />
          <KpiCard
            label="À attribuer"
            value={kpis.countAAttribuer}
            sublabel="en attente"
            highlight={kpis.countAAttribuer > 0}
          />
          <KpiCard label="En cours" value={kpis.countEnCours} />
        </div>
      </section>

      {/* KPIs — finance */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Finance &mdash; {monthLabel}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Gain mensuel"
            value={formatPrix(kpis.gain)}
            sublabel="marge nette"
            highlight
          />
          <KpiCard
            label="CA clients"
            value={formatPrix(kpis.revenue)}
            sublabel="ménage HT (hors linge)"
          />
          <KpiCard
            label="Coût prestataires"
            value={formatPrix(kpis.providerCost)}
            sublabel="prix presta HT"
          />
          <KpiCard
            label="Blanchisserie"
            value={formatPrix(kpis.blanchisserie)}
            sublabel="incluse dans le gain"
          />
        </div>
      </section>

      {/* Interventions du jour */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Interventions du jour
          </h2>
          <Link href="/admin/interventions" className="text-xs text-primary hover:underline">
            Voir tout &rarr;
          </Link>
        </div>

        {!upcoming.data?.length ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aucune intervention aujourd&apos;hui.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Logement</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Prestataire</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.data.map((intervention) => (
                  <TableRow key={intervention.id}>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      <Link href={`/admin/interventions/${intervention.id}`} className="block hover:text-primary">
                        {formatDate(intervention.date)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/interventions/${intervention.id}`} className="block hover:text-primary">
                        {intervention.logement?.name ?? "—"}
                        {intervention.logement?.city && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({intervention.logement.city})
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>{intervention.client?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      {intervention.prestataire?.full_name ?? (
                        <span className="text-muted-foreground text-xs">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={intervention.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
