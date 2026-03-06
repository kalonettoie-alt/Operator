"use client";

// Composant : panneau d'assignation / désassignation d'un prestataire
// Affiché sur la page détail d'une intervention.
//
// - Si statut = 'a_attribuer' : select prestataires + bouton Assigner
// - Si statut = 'assignee'    : nom du prestataire + bouton Désassigner

import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import { usePrestataires } from "@/lib/hooks/useProfiles";
import {
  useAssignIntervention,
  useDesassignIntervention,
} from "@/lib/hooks/useInterventions";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionDetail } from "@/lib/hooks/useInterventions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssignPrestatairePanelProps {
  intervention: InterventionDetail;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AssignPrestairePanel({ intervention }: AssignPrestatairePanelProps) {
  const { data: prestataires, isLoading: prestatairesLoading } = usePrestataires();
  const assignMutation = useAssignIntervention();
  const desassignMutation = useDesassignIntervention();

  // Prestataire sélectionné dans le select (mode assignation)
  const [selectedId, setSelectedId] = useState<string>("");

  const status = intervention.status;

  // ── Cas 1 : statut = 'a_attribuer' → formulaire d'assignation ──
  if (status === INTERVENTION_STATUSES.A_ATTRIBUER) {
    async function handleAssigner() {
      if (!selectedId) {
        toast.error("Veuillez sélectionner un prestataire");
        return;
      }
      try {
        await assignMutation.mutateAsync({
          interventionId: intervention.id,
          prestataireId: selectedId,
        });
        toast.success("Prestataire assigné avec succès");
        setSelectedId("");
      } catch (err) {
        toast.error("Erreur lors de l'assignation");
        Sentry.captureException(err, {
          extra: { context: "AssignPrestairePanel.handleAssigner", interventionId: intervention.id },
        });
      }
    }

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1.5">Assigner un prestataire</p>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={prestatairesLoading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Sélectionner un prestataire…</option>
            {(prestataires ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleAssigner}
          disabled={!selectedId || assignMutation.isPending}
          className="shrink-0"
        >
          <UserCheck className="size-4 mr-1.5" />
          {assignMutation.isPending ? "Assignation…" : "Assigner"}
        </Button>
      </div>
    );
  }

  // ── Cas 2 : statut = 'assignee' → affichage + bouton désassigner ──
  if (status === INTERVENTION_STATUSES.ASSIGNEE) {
    async function handleDesassigner() {
      try {
        await desassignMutation.mutateAsync(intervention.id);
        toast.success("Prestataire désassigné");
      } catch (err) {
        toast.error("Erreur lors de la désassignation");
        Sentry.captureException(err, {
          extra: { context: "AssignPrestairePanel.handleDesassigner", interventionId: intervention.id },
        });
      }
    }

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1.5">Prestataire assigné</p>
          <p className="text-sm font-medium">
            {intervention.prestataire?.full_name ?? "—"}
          </p>
          {intervention.assigned_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigné le{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(intervention.assigned_at))}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleDesassigner}
          disabled={desassignMutation.isPending}
          className="shrink-0 text-destructive hover:text-destructive"
        >
          <UserX className="size-4 mr-1.5" />
          {desassignMutation.isPending ? "Désassignation…" : "Désassigner"}
        </Button>
      </div>
    );
  }

  // Autres statuts : panneau non affiché
  return null;
}
