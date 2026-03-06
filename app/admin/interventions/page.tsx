"use client";

// Page : liste des interventions admin (lecture seule)
// Filtres : statut, dates, client, prestataire — appliqués côté Supabase.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { useInterventions, type InterventionFilters } from "@/lib/hooks/useInterventions";
import { useClients, usePrestataires } from "@/lib/hooks/useProfiles";
import { InterventionForm } from "@/components/forms/InterventionForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INTERVENTION_STATUSES, type InterventionStatus } from "@/types/enums";

// ─── Constantes ───────────────────────────────────────────────────────────────

// Tous les statuts dans l'ordre logique du workflow
const ALL_STATUSES: InterventionStatus[] = [
  INTERVENTION_STATUSES.A_ATTRIBUER,
  INTERVENTION_STATUSES.ASSIGNEE,
  INTERVENTION_STATUSES.ACCEPTEE,
  INTERVENTION_STATUSES.EN_COURS,
  INTERVENTION_STATUSES.TERMINEE,
  INTERVENTION_STATUSES.REFUSEE,
  INTERVENTION_STATUSES.ANNULEE,
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Composant filtre statut (pills) ─────────────────────────────────────────

interface StatusFilterProps {
  value: InterventionStatus | undefined;
  onChange: (status: InterventionStatus | undefined) => void;
}

function StatusFilter({ value, onChange }: StatusFilterProps) {
  const labels: Record<InterventionStatus, string> = {
    a_attribuer: "À attribuer",
    assignee: "Assignée",
    acceptee: "Acceptée",
    en_cours: "En cours",
    terminee: "Terminée",
    refusee: "Refusée",
    annulee: "Annulée",
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={value === undefined ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(undefined)}
      >
        Tous
      </Button>
      {ALL_STATUSES.map((s) => (
        <Button
          key={s}
          variant={value === s ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(value === s ? undefined : s)}
        >
          {labels[s]}
        </Button>
      ))}
    </div>
  );
}

// ─── Utilitaire : plage du mois courant ───────────────────────────────────────

function getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Premier jour du mois (YYYY-MM-DD)
  const dateFrom = new Date(year, month, 1).toISOString().slice(0, 10);
  // Dernier jour du mois
  const dateTo = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function InterventionsPage() {
  // Dialog de création
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Mode de filtrage des dates : 'mois' (ce mois-ci, défaut) ou 'custom' (période libre)
  const [dateMode, setDateMode] = useState<"mois" | "custom">("mois");

  // Filtres — initialisés sur le mois courant par défaut
  const [filters, setFilters] = useState<InterventionFilters>(() => ({
    ...getCurrentMonthRange(),
  }));

  // Données
  const { data: interventions, isLoading, error } = useInterventions(filters);
  const router = useRouter();

  // ──
  const { data: clients } = useClients();
  const { data: prestataires } = usePrestataires();

  // Helpers pour mettre à jour un seul filtre
  function setFilter<K extends keyof InterventionFilters>(
    key: K,
    value: InterventionFilters[K]
  ) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  // Bascule vers le mode "ce mois-ci"
  function switchToCurrentMonth() {
    setDateMode("mois");
    setFilters((prev) => ({ ...prev, ...getCurrentMonthRange() }));
  }

  // Bascule vers le mode "période personnalisée"
  function switchToCustom() {
    setDateMode("custom");
  }

  function resetFilters() {
    setDateMode("mois");
    setFilters(getCurrentMonthRange());
  }

  // Il y a des filtres actifs si un filtre autre que les dates du mois courant est défini
  const { dateFrom: moisFrom, dateTo: moisTo } = getCurrentMonthRange();
  const hasActiveFilters =
    dateMode === "custom" ||
    filters.status !== undefined ||
    filters.clientId !== undefined ||
    filters.prestataireId !== undefined ||
    filters.dateFrom !== moisFrom ||
    filters.dateTo !== moisTo;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Interventions</h1>
          {!isLoading && !error && (
            <p className="text-sm text-muted-foreground mt-1">
              {interventions?.length ?? 0} résultat
              {(interventions?.length ?? 0) > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          )}
          <Button onClick={() => setIsCreateOpen(true)}>
            <PlusIcon className="size-4 mr-2" />
            Nouvelle intervention
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        {/* Filtre par statut */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Statut
          </p>
          <StatusFilter
            value={filters.status}
            onChange={(s) => setFilter("status", s)}
          />
        </div>

        {/* Période + dates + client + prestataire — tout sur une ligne */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Boutons de période */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Période
            </p>
            <div className="flex gap-2">
              <Button
                variant={dateMode === "mois" ? "default" : "outline"}
                size="sm"
                onClick={switchToCurrentMonth}
              >
                Ce mois-ci
              </Button>
              <Button
                variant={dateMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={switchToCustom}
              >
                Choisir une période
              </Button>
            </div>
          </div>

          {/* Champs de dates — visibles uniquement en mode "période libre" */}
          {dateMode === "custom" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Date début
                </label>
                <Input
                  type="date"
                  className="w-40"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Date fin
                </label>
                <Input
                  type="date"
                  className="w-40"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Client */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Client
            </label>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={filters.clientId ?? ""}
              onChange={(e) => setFilter("clientId", e.target.value)}
            >
              <option value="">Tous les clients</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Prestataire */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Prestataire
            </label>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={filters.prestataireId ?? ""}
              onChange={(e) => setFilter("prestataireId", e.target.value)}
            >
              <option value="">Tous les prestataires</option>
              {prestataires?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Chargement…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-16 text-destructive text-sm">
          Erreur lors du chargement des interventions.
        </div>
      ) : !interventions?.length ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Aucune intervention ne correspond aux filtres.
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Logement</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Prestataire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Prix client</TableHead>
                <TableHead className="text-right">Prix presta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interventions.map((intervention) => (
                <TableRow
                  key={intervention.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/interventions/${intervention.id}`)}
                >
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatDate(intervention.date)}
                  </TableCell>
                  <TableCell>
                    {intervention.logement ? (
                      <span>
                        {intervention.logement.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({intervention.logement.city})
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {intervention.client?.full_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {intervention.prestataire?.full_name ?? (
                      <span className="text-muted-foreground text-xs">
                        Non assigné
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={intervention.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrix(intervention.prix_client_ttc)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrix(intervention.prix_prestataire_ht)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog création */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle intervention</DialogTitle>
          </DialogHeader>
          <InterventionForm
            key={isCreateOpen ? "open" : "closed"}
            onSuccess={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
