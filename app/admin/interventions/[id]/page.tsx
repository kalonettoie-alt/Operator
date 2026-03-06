"use client";

// Page : détail d'une intervention (admin)
// Affiche toutes les infos + le rapport avec photos.

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, PencilIcon } from "lucide-react";
import { useIntervention } from "@/lib/hooks/useInterventions";
import { useRapport } from "@/lib/hooks/useRapports";
import { InterventionForm } from "@/components/forms/InterventionForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { AssignPrestairePanel } from "@/components/ui/AssignPrestairePanel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Json } from "@/types/database";
import { INTERVENTION_TYPES, INTERVENTION_STATUSES } from "@/types/enums";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

const TYPE_LABELS: Record<string, string> = {
  [INTERVENTION_TYPES.MENAGE]: "Ménage",
  [INTERVENTION_TYPES.ETAT_LIEUX]: "État des lieux",
  [INTERVENTION_TYPES.MAINTENANCE]: "Maintenance",
};

// ─── Composant : ligne info ───────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ─── Composant : checklist tâches du rapport ─────────────────────────────────

function TachesChecklist({ taches }: { taches: Json }) {
  if (!taches || !Array.isArray(taches)) {
    return <p className="text-sm text-muted-foreground">Aucune tâche enregistrée.</p>;
  }

  return (
    <ul className="space-y-2">
      {(taches as Array<{ label?: string; done?: boolean; [k: string]: unknown }>).map(
        (tache, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              className={`size-4 rounded border flex items-center justify-center text-xs ${
                tache.done
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-muted-foreground"
              }`}
            >
              {tache.done ? "✓" : ""}
            </span>
            <span className={tache.done ? "" : "text-muted-foreground"}>
              {String(tache.label ?? tache)}
            </span>
          </li>
        )
      )}
    </ul>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function InterventionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: intervention, isLoading, error } = useIntervention(id);
  const { data: rapport, isLoading: rapportLoading } = useRapport(id);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // ── États de chargement ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Chargement…
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/admin/interventions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" /> Retour
          </Button>
        </Link>
        <p className="text-destructive text-sm">
          Intervention introuvable ou erreur de chargement.
        </p>
      </div>
    );
  }

  const etatLieuxPhotos = intervention.photos_etat_lieux ?? [];
  const interventionPhotos = rapport?.photos_intervention ?? [];
  const degatsPhotos = rapport?.degats_photos ?? [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Navigation */}
      <Link href="/admin/interventions">
        <Button variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft className="size-4 mr-1" /> Retour aux interventions
        </Button>
      </Link>

      {/* En-tête */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {intervention.logement?.name ?? "Logement inconnu"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {formatDate(intervention.date)}
            {" · "}
            {TYPE_LABELS[intervention.type] ?? intervention.type}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={intervention.status} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
          >
            <PencilIcon className="size-4 mr-1" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Section : informations générales */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Logement */}
        <Card>
          <CardHeader><CardTitle>Logement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Adresse" value={
              intervention.logement
                ? `${intervention.logement.address}, ${intervention.logement.postal_code} ${intervention.logement.city}`
                : null
            } />
            {intervention.logement?.zone && (
              <InfoRow label="Zone" value={
                <Badge variant="secondary">{intervention.logement.zone}</Badge>
              } />
            )}
            {intervention.logement?.access_code && (
              <InfoRow label="Code d'accès" value={
                <span className="font-mono">{intervention.logement.access_code}</span>
              } />
            )}
            {intervention.logement?.instructions && (
              <InfoRow label="Instructions" value={
                <span className="whitespace-pre-wrap">{intervention.logement.instructions}</span>
              } />
            )}
          </CardContent>
        </Card>

        {/* Personnes */}
        <Card>
          <CardHeader><CardTitle>Personnes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Client" value={intervention.client?.full_name} />
            {intervention.client?.phone && (
              <InfoRow label="Tél. client" value={intervention.client.phone} />
            )}
            {/* Prestataire — affiché uniquement si déjà assigné ET statut autre que a_attribuer/assignee */}
            {intervention.status !== INTERVENTION_STATUSES.A_ATTRIBUER &&
              intervention.status !== INTERVENTION_STATUSES.ASSIGNEE && (
              <>
                <InfoRow label="Prestataire" value={
                  intervention.prestataire?.full_name ?? (
                    <span className="text-muted-foreground">Non assigné</span>
                  )
                } />
                {intervention.prestataire?.phone && (
                  <InfoRow label="Tél. prestataire" value={intervention.prestataire.phone} />
                )}
              </>
            )}
            {/* Panneau d'assignation/désassignation pour les statuts éligibles */}
            {(intervention.status === INTERVENTION_STATUSES.A_ATTRIBUER ||
              intervention.status === INTERVENTION_STATUSES.ASSIGNEE) && (
              <div className="pt-1">
                <AssignPrestairePanel intervention={intervention} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prix */}
        <Card>
          <CardHeader><CardTitle>Prix</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Prix client TTC" value={formatPrix(intervention.prix_client_ttc)} />
            <InfoRow label="Prix prestataire HT" value={formatPrix(intervention.prix_prestataire_ht)} />
            {intervention.blanchisserie_incluse && (
              <InfoRow label="Blanchisserie" value={formatPrix(intervention.prix_blanchisserie)} />
            )}
          </CardContent>
        </Card>

        {/* Infos voyageurs */}
        {(intervention.nb_voyageurs || intervention.has_baby || intervention.special_instructions) && (
          <Card>
            <CardHeader><CardTitle>Informations voyageurs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {intervention.nb_voyageurs && (
                <InfoRow label="Nb voyageurs" value={intervention.nb_voyageurs} />
              )}
              {intervention.has_baby && (
                <InfoRow label="Bébé" value="Oui — lit bébé requis" />
              )}
              {intervention.checkin_meme_jour && (
                <InfoRow label="Check-in même jour" value="Oui — urgence" />
              )}
              {intervention.special_instructions && (
                <InfoRow label="Instructions spéciales" value={
                  <span className="whitespace-pre-wrap">{intervention.special_instructions}</span>
                } />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section : photos état des lieux */}
      {etatLieuxPhotos.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Photos état des lieux</CardTitle></CardHeader>
          <CardContent>
            <PhotoGallery photos={etatLieuxPhotos} />
          </CardContent>
        </Card>
      )}

      {/* Section : rapport */}
      <Card>
        <CardHeader><CardTitle>Rapport d&apos;intervention</CardTitle></CardHeader>
        <CardContent>
          {rapportLoading ? (
            <p className="text-sm text-muted-foreground">Chargement du rapport…</p>
          ) : !rapport ? (
            <p className="text-sm text-muted-foreground">
              Aucun rapport soumis pour cette intervention.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Tâches effectuées */}
              <div>
                <p className="text-sm font-medium mb-3">Tâches effectuées</p>
                <TachesChecklist taches={rapport.taches_effectuees} />
              </div>

              {/* Photos intervention */}
              {interventionPhotos.length > 0 && (
                <div>
                  <PhotoGallery photos={interventionPhotos} title="Photos du ménage" />
                </div>
              )}

              {/* Dégâts */}
              {rapport.degats_signales && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <AlertTriangle className="size-4" />
                    Dégâts signalés
                  </div>
                  {rapport.degats_description && (
                    <p className="text-sm whitespace-pre-wrap">{rapport.degats_description}</p>
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

      {/* Annulation */}
      {intervention.cancellation_reason && (
        <Card>
          <CardHeader><CardTitle>Motif d&apos;annulation</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{intervention.cancellation_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog modification */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier — {intervention.logement?.name ?? "Intervention"}
            </DialogTitle>
          </DialogHeader>
          <InterventionForm
            key={intervention.id}
            intervention={intervention}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
