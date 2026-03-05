"use client";

// Page : liste des prestataires (admin uniquement, lecture seule)
// Affiche tous les profils avec le rôle "prestataire".

import { usePrestataires } from "@/lib/hooks/useProfiles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
      Aucun prestataire pour le moment.
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrestatairesPage() {
  const { data: prestataires, isLoading, error } = usePrestataires();

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        Erreur lors du chargement des prestataires.
      </div>
    );
  }

  if (!prestataires?.length) return <EmptyState />;

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold">Prestataires</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {prestataires.length} prestataire{prestataires.length > 1 ? "s" : ""} enregistré
          {prestataires.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Interventions / jour</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prestataires.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{p.phone ?? "—"}</TableCell>
                <TableCell>
                  {p.zone ? (
                    <Badge variant="secondary">{p.zone}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {p.max_daily_interventions ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
