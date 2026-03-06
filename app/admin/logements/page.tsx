"use client";

// Page : liste des logements avec création et modification.
// Chaque logement peut être modifié via un Dialog pré-rempli.

import { useState } from "react";
import { PlusIcon, PencilIcon } from "lucide-react";

import { useLogements, type LogementWithClient } from "@/lib/hooks/useLogements";
import { LogementForm } from "@/components/forms/LogementForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Utilitaire : formatage des prix ─────────────────────────────────────────

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LøgementsPage() {
  const { data: logements, isLoading, error } = useLogements();

  // Dialog : null = fermé, undefined = création, LogementWithClient = édition
  const [dialogLogement, setDialogLogement] = useState<
    LogementWithClient | null | undefined
  >(null);

  const isOpen = dialogLogement !== null;

  function openCreate() {
    setDialogLogement(undefined); // undefined = mode création
  }

  function openEdit(logement: LogementWithClient) {
    setDialogLogement(logement);
  }

  function closeDialog() {
    setDialogLogement(null);
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Logements</h1>
          {!isLoading && !error && (
            <p className="text-sm text-muted-foreground mt-1">
              {logements?.length ?? 0} logement
              {(logements?.length ?? 0) > 1 ? "s" : ""} enregistré
              {(logements?.length ?? 0) > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="size-4 mr-2" />
          Ajouter un logement
        </Button>
      </div>

      {/* États de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Chargement…
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-16 text-destructive text-sm">
          Erreur lors du chargement des logements.
        </div>
      )}

      {!isLoading && !error && !logements?.length && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground text-sm rounded-lg border border-dashed">
          <p>Aucun logement pour le moment.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <PlusIcon className="size-4 mr-2" />
            Créer le premier logement
          </Button>
        </div>
      )}

      {/* Tableau */}
      {!isLoading && !error && !!logements?.length && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Prix client TTC</TableHead>
                <TableHead className="text-right">Prix presta HT</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logements.map((logement) => (
                <TableRow key={logement.id}>
                  <TableCell className="font-medium">{logement.name}</TableCell>
                  <TableCell>{logement.address}</TableCell>
                  <TableCell>
                    {logement.postal_code} {logement.city}
                  </TableCell>
                  <TableCell>
                    {logement.client?.full_name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {logement.zone ? (
                      <Badge variant="secondary">{logement.zone}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrix(logement.prix_client_ttc)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrix(logement.prix_prestataire_ht)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(logement)}
                      aria-label="Modifier"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog création / édition */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogLogement
                ? `Modifier — ${dialogLogement.name}`
                : "Ajouter un logement"}
            </DialogTitle>
          </DialogHeader>
          {/* Le formulaire est re-monté à chaque ouverture grâce à la key */}
          <LogementForm
            key={dialogLogement?.id ?? "new"}
            logement={dialogLogement ?? undefined}
            onSuccess={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
