"use client";

// Dialog de confirmation d'annulation d'une intervention.
// Affiche un champ texte obligatoire pour le motif.
// Appelle useAnnulerIntervention au submit.

import { useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAnnulerIntervention } from "@/lib/hooks/useInterventions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnulerInterventionDialogProps {
  interventionId: string;
  /** Callback appelé après annulation réussie (ex: fermer la page ou rafraîchir) */
  onSuccess?: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AnnulerInterventionDialog({
  interventionId,
  onSuccess,
}: AnnulerInterventionDialogProps) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const annulerMutation = useAnnulerIntervention();

  async function handleConfirmer() {
    if (!motif.trim()) {
      toast.error("Le motif d'annulation est obligatoire");
      return;
    }

    try {
      await annulerMutation.mutateAsync({
        interventionId,
        motif: motif.trim(),
      });
      toast.success("Intervention annulée");
      setOpen(false);
      setMotif("");
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de l'annulation");
      Sentry.captureException(err, {
        extra: { context: "AnnulerInterventionDialog", interventionId },
      });
    }
  }

  function handleOpenChange(isOpen: boolean) {
    // Réinitialise le motif à la fermeture
    if (!isOpen) setMotif("");
    setOpen(isOpen);
  }

  return (
    <>
      {/* Bouton déclencheur */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
      >
        <XCircle className="size-4 mr-1.5" />
        Annuler l&apos;intervention
      </Button>

      {/* Dialog de confirmation */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Annuler l&apos;intervention</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. Le prestataire sera délié de
              l&apos;intervention.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="motif-annulation"
                className="text-sm font-medium"
              >
                Motif d&apos;annulation <span className="text-destructive">*</span>
              </label>
              <textarea
                id="motif-annulation"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Expliquez la raison de l'annulation…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={annulerMutation.isPending}
            >
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmer}
              disabled={!motif.trim() || annulerMutation.isPending}
            >
              <XCircle className="size-4 mr-1.5" />
              {annulerMutation.isPending ? "Annulation…" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
