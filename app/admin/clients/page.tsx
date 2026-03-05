"use client";

// Page : liste des clients (admin uniquement, lecture seule)
// Affiche tous les profils avec le rôle "client".

import { useClients } from "@/lib/hooks/useProfiles";
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
      Aucun client pour le moment.
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients();

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        Erreur lors du chargement des clients.
      </div>
    );
  }

  if (!clients?.length) return <EmptyState />;

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} client{clients.length > 1 ? "s" : ""} enregistré
            {clients.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Zone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.full_name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone ?? "—"}</TableCell>
                <TableCell>{client.company_name ?? "—"}</TableCell>
                <TableCell>
                  {client.zone ? (
                    <Badge variant="secondary">{client.zone}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
