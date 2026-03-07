"use client";

// Dashboard Prestataire — missions du jour, en attente, semaine, revenus du mois.

import Link from "next/link";
import { CalendarDays, Clock, CheckCircle2, Euro } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { usePrestataireDashboard } from "@/lib/hooks/useMissionsPrestataire";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
    weekday: "long",
    day: "2-digit",
    month: "long",
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
  icon: React.ReactNode;
  highlight?: boolean;
}

function KpiCard({ label, value, sublabel, icon, highlight }: KpiCardProps) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
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

// ─── Composant : ligne mission ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

interface MissionRowProps {
  mission: {
    id: string;
    date: string;
    status: string;
    type: string;
    logement: { name: string; city: string } | null;
  };
}

function MissionRow({ mission }: MissionRowProps) {
  return (
    <Link
      href={`/prestataire/missions/${mission.id}`}
      className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium text-sm truncate">
          {mission.logement?.name ?? "Logement inconnu"}
        </span>
        <span className="text-xs text-muted-foreground">
          {mission.logement?.city} · {TYPE_LABELS[mission.type] ?? mission.type}
        </span>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {formatDate(mission.date)}
        </span>
        <StatusBadge status={mission.status} />
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrestataireDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: stats,
    isLoading,
    error,
  } = usePrestataireDashboard(user?.id ?? null);

  if (authLoading || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Erreur lors du chargement du dashboard.</p>
      </div>
    );
  }

  const {
    missionsAujourdhui,
    missionsEnAttente,
    missionsASemaine,
    revenusduMois,
  } = stats ?? {
    missionsAujourdhui: [],
    missionsEnAttente: [],
    missionsASemaine: [],
    revenusduMois: 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Mon tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Aujourd'hui"
          value={missionsAujourdhui.length}
          sublabel="mission(s) du jour"
          icon={<CalendarDays className="size-4" />}
          highlight={missionsAujourdhui.length > 0}
        />
        <KpiCard
          label="En attente"
          value={missionsEnAttente.length}
          sublabel="à accepter ou refuser"
          icon={<Clock className="size-4" />}
          highlight={missionsEnAttente.length > 0}
        />
        <KpiCard
          label="Cette semaine"
          value={missionsASemaine.length}
          sublabel="missions à venir"
          icon={<CheckCircle2 className="size-4" />}
        />
        <KpiCard
          label="Revenus"
          value={formatPrix(revenusduMois)}
          sublabel={getCurrentMonthLabel()}
          icon={<Euro className="size-4" />}
          highlight
        />
      </div>

      {/* Missions en attente d'acceptation */}
      {missionsEnAttente.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700 flex items-center gap-2">
              <Clock className="size-4" />
              En attente de votre réponse ({missionsEnAttente.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="divide-y divide-border/40">
              {missionsEnAttente.map((m) => (
                <MissionRow key={m.id} mission={m} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missions du jour */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4" />
            Missions du jour
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          {missionsAujourdhui.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3">
              Aucune mission aujourd&apos;hui.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {missionsAujourdhui.map((m) => (
                <MissionRow key={m.id} mission={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missions à venir cette semaine */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            Cette semaine
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          {missionsASemaine.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3">
              Aucune mission prévue cette semaine.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {missionsASemaine.map((m) => (
                <MissionRow key={m.id} mission={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lien vers toutes les missions */}
      <div className="text-center pb-4">
        <Link
          href="/prestataire/missions"
          className="text-sm text-primary hover:underline"
        >
          Voir toutes mes missions →
        </Link>
      </div>
    </div>
  );
}
