"use client";

// Détail d'une intervention — vue client (lecture seule, sans boutons d'action).
// Affiche : infos logement, date/type/statut, rapport avec tâches + photos.
// Sécurité : le filtre client_id n'est pas nécessaire ici — le RLS Supabase
// garantit qu'un client ne peut lire que ses propres interventions.

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Camera } from "lucide-react";
import { useIntervention } from "@/lib/hooks/useInterventions";
import { useRapport } from "@/lib/hooks/useRapports";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";
import type { Json } from "@/types/database";

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
    <Badge variant="outline" className={`text-sm border ${config.className}`}>
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
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// Ligne info label / valeur
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

// Checklist tâches effectuées (lecture seule)
function TachesReadOnly({ taches }: { taches: Json }) {
  if (!taches || !Array.isArray(taches) || taches.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune tâche enregistrée.</p>;
  }

  const items = taches as Array<{ label?: string; done?: boolean }>;
  const done = items.filter((t) => t.done).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {done}/{items.length} tâche{items.length > 1 ? "s" : ""} effectuée{done > 1 ? "s" : ""}
      </p>
      <ul className="space-y-2">
        {items.map((tache, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              className={`size-4 rounded border flex items-center justify-center text-xs shrink-0 ${
                tache.done
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-300 bg-white"
              }`}
            >
              {tache.done ? "✓" : ""}
            </span>
            <span className={tache.done ? "text-gray-700" : "text-muted-foreground"}>
              {String(tache.label ?? tache)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientInterventionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: intervention, isLoading, error } = useIntervention(id);
  const { data: rapport, isLoading: rapportLoading } = useRapport(id);

  // ── Chargement ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <Link href="/client/interventions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" /> Retour
          </Button>
        </Link>
        <p className="text-sm text-destructive">
          Intervention introuvable ou erreur de chargement.
        </p>
      </div>
    );
  }

  const etatLieuxPhotos = (intervention.photos_etat_lieux as string[]) ?? [];
  const interventionPhotos = (rapport?.photos_intervention as string[]) ?? [];
  const degatsPhotos = (rapport?.degats_photos as string[]) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

      {/* Retour */}
      <Link href="/client/interventions">
        <Button variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft className="size-4 mr-1" /> Retour aux interventions
        </Button>
      </Link>

      {/* En-tête */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {intervention.logement?.name ?? "Logement inconnu"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {formatDate(intervention.date)}
            {" · "}
            {TYPE_LABELS[intervention.type] ?? intervention.type}
          </p>
        </div>
        <div className="shrink-0">
          <ClientStatusBadge status={intervention.status} />
        </div>
      </div>

      {/* Infos logement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {intervention.logement && (
            <InfoRow
              label="Adresse"
              value={`${intervention.logement.address}, ${intervention.logement.postal_code} ${intervention.logement.city}`}
            />
          )}
          {intervention.logement?.zone && (
            <InfoRow
              label="Zone"
              value={<Badge variant="secondary">{intervention.logement.zone}</Badge>}
            />
          )}
        </CardContent>
      </Card>

      {/* Infos voyageurs — si renseignées */}
      {(intervention.nb_voyageurs || intervention.has_baby || intervention.special_instructions) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations séjour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {intervention.nb_voyageurs && (
              <InfoRow label="Voyageurs" value={intervention.nb_voyageurs} />
            )}
            {intervention.has_baby && (
              <InfoRow label="Bébé" value="Oui — lit bébé requis" />
            )}
            {intervention.checkin_meme_jour && (
              <InfoRow label="Check-in même jour" value="Oui" />
            )}
            {intervention.special_instructions && (
              <InfoRow
                label="Instructions spéciales"
                value={<span className="whitespace-pre-wrap">{intervention.special_instructions}</span>}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Photos état des lieux */}
      {etatLieuxPhotos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="size-4" />
              État des lieux
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {etatLieuxPhotos.length} photo{etatLieuxPhotos.length > 1 ? "s" : ""}
              </span>
            </CardTitle>
            {intervention.etat_lieux_at && (
              <p className="text-xs text-muted-foreground">
                Réalisé le {formatDateTime(intervention.etat_lieux_at)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <PhotoGallery photos={etatLieuxPhotos} />
          </CardContent>
        </Card>
      )}

      {/* Rapport d'intervention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rapport d&apos;intervention</CardTitle>
        </CardHeader>
        <CardContent>
          {rapportLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          ) : !rapport ? (
            <p className="text-sm text-muted-foreground">
              {intervention.status === INTERVENTION_STATUSES.TERMINEE
                ? "Rapport en cours de finalisation."
                : "Le rapport sera disponible une fois l'intervention terminée."}
            </p>
          ) : (
            <div className="space-y-6">

              {/* Tâches effectuées */}
              <div>
                <p className="text-sm font-medium mb-3">Tâches effectuées</p>
                <TachesReadOnly taches={rapport.taches_effectuees} />
              </div>

              {/* Photos après intervention */}
              {interventionPhotos.length > 0 && (
                <div>
                  <PhotoGallery photos={interventionPhotos} title="Photos après ménage" />
                </div>
              )}

              {/* Dégâts signalés */}
              {rapport.degats_signales && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                    <AlertTriangle className="size-4" />
                    Dégât(s) signalé(s) lors de l&apos;intervention
                  </div>
                  {rapport.degats_description && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {rapport.degats_description}
                    </p>
                  )}
                  {degatsPhotos.length > 0 && (
                    <PhotoGallery photos={degatsPhotos} title="Photos des dégâts" />
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annulation — si applicable */}
      {intervention.cancellation_reason && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Intervention annulée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {intervention.cancellation_reason}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
