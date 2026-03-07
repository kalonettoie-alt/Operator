"use client";

// Détail d'une mission — vue prestataire.
// Affiche les infos du logement, la date, le type, le prix prestataire.
// Si status = 'assignee' : boutons Accepter / Refuser avec confirmation.
// Après action : invalidation cache + redirection vers le dashboard.

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  KeyRound,
  ScrollText,
  Users,
  Euro,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

import {
  useMissionDetail,
  useAccepterMission,
  useRefuserMission,
} from "@/lib/hooks/useMissionsPrestataire";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTERVENTION_STATUSES, INTERVENTION_TYPES } from "@/types/enums";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

const TYPE_LABELS: Record<string, string> = {
  [INTERVENTION_TYPES.MENAGE]: "Ménage",
  [INTERVENTION_TYPES.ETAT_LIEUX]: "État des lieux",
  [INTERVENTION_TYPES.MAINTENANCE]: "Maintenance",
};

// ─── Composant : ligne info ────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: mission, isLoading, error } = useMissionDetail(id);
  const accepterMutation = useAccepterMission();
  const refuserMutation = useRefuserMission();

  const isMutating = accepterMutation.isPending || refuserMutation.isPending;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleAccepter() {
    try {
      await accepterMutation.mutateAsync(id);
      toast.success("Mission acceptée !");
      router.push("/prestataire");
    } catch (err) {
      toast.error("Erreur lors de l'acceptation");
      Sentry.captureException(err, {
        extra: { context: "handleAccepterMission", interventionId: id },
      });
    }
  }

  async function handleRefuser() {
    try {
      await refuserMutation.mutateAsync(id);
      toast.success("Mission refusée");
      router.push("/prestataire");
    } catch (err) {
      toast.error("Erreur lors du refus");
      Sentry.captureException(err, {
        extra: { context: "handleRefuserMission", interventionId: id },
      });
    }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">

      {/* Navigation retour */}
      <Link
        href="/prestataire/missions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Mes missions
      </Link>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">
                {mission?.logement?.name ?? "Mission"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {mission ? TYPE_LABELS[mission.type] ?? mission.type : ""}
              </p>
            </>
          )}
        </div>
        {!isLoading && mission && (
          <StatusBadge status={mission.status} />
        )}
      </div>

      {/* Erreur */}
      {error && (
        <p className="text-sm text-destructive">
          Impossible de charger cette mission.
        </p>
      )}

      {/* Boutons Accepter / Refuser — visibles uniquement si status = 'assignee' */}
      {!isLoading && mission?.status === INTERVENTION_STATUSES.ASSIGNEE && (
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleAccepter}
            disabled={isMutating}
            className="flex-1 sm:flex-none"
          >
            <CheckCircle2 className="size-4 mr-1.5" />
            {accepterMutation.isPending ? "Acceptation…" : "Accepter la mission"}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefuser}
            disabled={isMutating}
            className="flex-1 sm:flex-none text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
          >
            <XCircle className="size-4 mr-1.5" />
            {refuserMutation.isPending ? "Refus…" : "Refuser"}
          </Button>
        </div>
      )}

      {/* Informations de la mission */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Détails de la mission</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-4 shrink-0 mt-1" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : mission ? (
            <>
              <InfoRow
                icon={<Calendar className="size-4" />}
                label="Date"
                value={formatDate(mission.date)}
              />
              {mission.nb_voyageurs !== null && (
                <InfoRow
                  icon={<Users className="size-4" />}
                  label="Nombre de voyageurs"
                  value={mission.nb_voyageurs}
                />
              )}
              {mission.has_baby && (
                <InfoRow
                  icon={<Users className="size-4" />}
                  label="Bébé présent"
                  value="Oui — prévoir lit bébé"
                />
              )}
              {mission.checkin_meme_jour && (
                <InfoRow
                  icon={<Calendar className="size-4" />}
                  label="Check-in le même jour"
                  value="Oui — délai serré"
                />
              )}
              <InfoRow
                icon={<Euro className="size-4" />}
                label="Votre rémunération HT"
                value={
                  <span className="text-base font-bold text-primary">
                    {formatPrix(mission.prix_prestataire_ht)}
                  </span>
                }
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Informations du logement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4" />
            Logement
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-4 shrink-0 mt-1" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : mission?.logement ? (
            <>
              <InfoRow
                icon={<MapPin className="size-4" />}
                label="Adresse"
                value={`${mission.logement.address}, ${mission.logement.postal_code} ${mission.logement.city}`}
              />
              {mission.logement.access_code && (
                <InfoRow
                  icon={<KeyRound className="size-4" />}
                  label="Code d'accès"
                  value={
                    <span className="font-mono text-base tracking-widest">
                      {mission.logement.access_code}
                    </span>
                  }
                />
              )}
              {mission.logement.instructions && (
                <InfoRow
                  icon={<ScrollText className="size-4" />}
                  label="Instructions"
                  value={
                    <span className="whitespace-pre-line text-sm leading-relaxed">
                      {mission.logement.instructions}
                    </span>
                  }
                />
              )}
            </>
          ) : !isLoading ? (
            <p className="text-sm text-muted-foreground py-2">
              Aucun logement associé.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Instructions spéciales de l'intervention */}
      {!isLoading && mission?.special_instructions && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="size-4" />
              Instructions spéciales
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm whitespace-pre-line leading-relaxed">
              {mission.special_instructions}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
