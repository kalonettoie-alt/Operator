"use client";

// StatusBadge — badge coloré selon le statut d'une intervention.
// Source de vérité unique : les couleurs sont définies ici, pas dans les pages.

import { Badge } from "@/components/ui/badge";
import { INTERVENTION_STATUSES, type InterventionStatus } from "@/types/enums";

// ─── Mapping statut → libellé + classe Tailwind ───────────────────────────────

const STATUS_CONFIG: Record<
  InterventionStatus,
  { label: string; className: string }
> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: {
    label: "À attribuer",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  [INTERVENTION_STATUSES.ASSIGNEE]: {
    label: "Assignée",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [INTERVENTION_STATUSES.ACCEPTEE]: {
    label: "Acceptée",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  [INTERVENTION_STATUSES.REFUSEE]: {
    label: "Refusée",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [INTERVENTION_STATUSES.EN_COURS]: {
    label: "En cours",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [INTERVENTION_STATUSES.TERMINEE]: {
    label: "Terminée",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  [INTERVENTION_STATUSES.ANNULEE]: {
    label: "Annulée",
    className: "bg-slate-50 text-slate-500 border-slate-200 line-through",
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string; // string pour accepter les valeurs brutes de la BDD
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as InterventionStatus];

  // Fallback si le statut est inconnu (évite un crash)
  if (!config) {
    return (
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`text-xs border ${config.className}`}>
      {config.label}
    </Badge>
  );
}
