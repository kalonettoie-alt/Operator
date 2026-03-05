"use client";

// Page : liste des logements (admin uniquement, lecture seule)
// Affiche tous les logements avec le client rattaché et les prix.

import { useLogements } from "@/lib/hooks/useLogements";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ─── Utilitaire : formatage des prix ─────────────────────────────────────────

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Sous-composants locaux ───────────────────────────────────────────────────

function Loader() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
      Chargement…
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
      Aucun logement pour le moment.
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LøgementsPage() {
  const { data: logements, isLoading, error } = useLogements();

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        Erreur lors du chargement des logements.
      </div>
    );
  }

  if (!logements?.length) return <EmptyState />;

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold">Logements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {logements.length} logement{logements.length > 1 ? "s" : ""} enregistré
          {logements.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Tableau */}
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
              <TableHead className="text-right">Prix prestataire HT</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
