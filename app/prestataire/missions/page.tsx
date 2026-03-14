"use client";

// Liste complète des missions du prestataire connecté.
// Filtres : statut. Skeletons inline pour éviter les chargements bloquants.
// La RLS Supabase garantit que seules les missions du prestataire sont renvoyées.

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Filter } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import {
  useMissionsPrestataire,
  type MissionWithLogement,
} from "@/lib/hooks/useMissionsPrestataire";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { INTERVENTION_STATUSES } from "@/types/enums";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

// ─── Options de filtre statut ─────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Toutes" },
  { value: INTERVENTION_STATUSES.ASSIGNEE, label: "En attente" },
  { value: INTERVENTION_STATUSES.ACCEPTEE, label: "Acceptées" },
  { value: INTERVENTION_STATUSES.EN_COURS, label: "En cours" },
  { value: INTERVENTION_STATUSES.TERMINEE, label: "Terminées" },
  { value: INTERVENTION_STATUSES.ANNULEE, label: "Annulées" },
] as const;

// ─── Composant : carte mission ────────────────────────────────────────────────

function MissionCard({ mission }: { mission: MissionWithLogement }) {
  return (
    <Link href={`/prestataire/missions/${mission.id}`} className="block">
      <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">
                {mission.logement?.name ?? "Logement inconnu"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {mission.logement?.city} · {TYPE_LABELS[mission.type] ?? mission.type}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" />
                <span>{formatDate(mission.date)}</span>
              </div>
            </div>
            <StatusBadge status={mission.status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Composant : skeleton d'une carte mission ─────────────────────────────────

function MissionCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MissionsPrestatairePage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const {
    data: missions,
    isLoading,
    error,
  } = useMissionsPrestataire(user?.id ?? null, {
    status: statusFilter || undefined,
  });

  // On n'attend plus authLoading : la structure de la page est affichée
  // immédiatement avec des skeletons. Évite la cascade auth → query → rendu.
  const loading = isLoading || !user;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Mes missions</h1>
        <div className="text-muted-foreground text-sm mt-1">
          {loading ? (
            <Skeleton className="inline-block h-3.5 w-28" />
          ) : (
            `${missions?.length ?? 0} mission(s) trouvée(s)`
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p className="text-sm text-destructive">
          Erreur lors du chargement — réessayez dans quelques instants.
        </p>
      )}

      {/* Filtres statut */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="size-4 text-muted-foreground shrink-0" />
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Liste des missions */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <MissionCardSkeleton key={i} />
          ))}
        </div>
      ) : !missions?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Aucune mission trouvée pour ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      )}
    </div>
  );
}
