"use client";

// Historique admin — toutes les interventions passées avec filtres.
// Filtres : statut, plage de dates, client, prestataire.
// Triées par date décroissante. Clic sur une ligne → détail.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";

import { useInterventions } from "@/lib/hooks/useInterventions";
import { useClients, usePrestataires } from "@/lib/hooks/useProfiles";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { INTERVENTION_STATUSES, type InterventionStatus } from "@/types/enums";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const TYPE_LABELS: Record<string, string> = {
  menage:      "Ménage",
  etat_lieux:  "État des lieux",
  maintenance: "Maintenance",
};

// Statuts "passés" par défaut dans l'historique
const STATUTS_HISTORIQUE: InterventionStatus[] = [
  INTERVENTION_STATUSES.TERMINEE,
  INTERVENTION_STATUSES.ANNULEE,
  INTERVENTION_STATUSES.REFUSEE,
];

const STATUTS_OPTIONS = [
  { value: "",                               label: "Tous les statuts" },
  { value: INTERVENTION_STATUSES.TERMINEE,   label: "Terminée" },
  { value: INTERVENTION_STATUSES.ANNULEE,    label: "Annulée" },
  { value: INTERVENTION_STATUSES.REFUSEE,    label: "Refusée" },
  { value: INTERVENTION_STATUSES.A_ATTRIBUER, label: "À attribuer" },
  { value: INTERVENTION_STATUSES.ASSIGNEE,   label: "Assignée" },
  { value: INTERVENTION_STATUSES.ACCEPTEE,   label: "Acceptée" },
  { value: INTERVENTION_STATUSES.EN_COURS,   label: "En cours" },
] as const;

// ─── Filtre select ─────────────────────────────────────────────────────────────

function FilterSelect({
  id, label, value, onChange, children,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        id={id} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminHistoriquePage() {
  const router = useRouter();

  // ── Filtres ───────────────────────────────────────────────────────────────
  // Par défaut : toutes les interventions jusqu'à aujourd'hui
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState(todayStr);
  const [filtreStatut,      setFiltreStatut]      = useState("");
  const [filtreClient,      setFiltreClient]      = useState("");
  const [filtrePrestataire, setFiltrePrestataire] = useState("");

  // ── Données ───────────────────────────────────────────────────────────────
  const { data: interventions, isLoading } = useInterventions({
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
    clientId:      filtreClient      || undefined,
    prestataireId: filtrePrestataire || undefined,
  });
  const { data: clients }      = useClients();
  const { data: prestataires } = usePrestataires();

  // ── Filtrage statut côté client (pour éviter une requête par valeur) ──────
  const filtered = useMemo(() => {
    const list = interventions ?? [];
    // Si aucun filtre statut choisi → montrer les statuts "historique" par défaut
    if (!filtreStatut) {
      return list.filter((i) =>
        STATUTS_HISTORIQUE.includes(i.status as InterventionStatus)
      );
    }
    return list.filter((i) => i.status === filtreStatut);
  }, [interventions, filtreStatut]);

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totalGain = useMemo(() => {
    return filtered
      .filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE)
      .reduce((sum, i) => sum + (i.prix_client_ttc ?? 0) - (i.prix_prestataire_ht ?? 0), 0);
  }, [filtered]);

  function resetFiltres() {
    setDateFrom("");
    setDateTo(todayStr());
    setFiltreStatut("");
    setFiltreClient("");
    setFiltrePrestataire("");
  }

  const hasFiltres = dateFrom || filtreStatut || filtreClient || filtrePrestataire;

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <History className="size-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading
                ? "Chargement…"
                : `${filtered.length} intervention${filtered.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {hasFiltres && (
          <button onClick={resetFiltres} className="text-xs text-blue-600 hover:underline shrink-0">
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white rounded-xl border p-3 shadow-sm">
        {/* Dates */}
        <div className="flex flex-col gap-1">
          <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground">Du</label>
          <input
            id="date-from" type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground">Au</label>
          <input
            id="date-to" type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <FilterSelect id="filtre-statut" label="Statut" value={filtreStatut} onChange={setFiltreStatut}>
          {STATUTS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FilterSelect>

        <FilterSelect id="filtre-client" label="Client" value={filtreClient} onChange={setFiltreClient}>
          <option value="">Tous les clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </FilterSelect>

        <FilterSelect id="filtre-presta" label="Prestataire" value={filtrePrestataire} onChange={setFiltrePrestataire}>
          <option value="">Tous les prestataires</option>
          {(prestataires ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </FilterSelect>
      </div>

      {/* ── Tableau ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Date</TableHead>
              <TableHead className="font-semibold text-slate-700">Logement</TableHead>
              <TableHead className="font-semibold text-slate-700">Type</TableHead>
              <TableHead className="font-semibold text-slate-700">Client</TableHead>
              <TableHead className="font-semibold text-slate-700">Prestataire</TableHead>
              <TableHead className="font-semibold text-slate-700">Statut</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">Gain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <p className="text-3xl mb-2">📭</p>
                  <p>Aucune intervention trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => {
                const gain = (i.prix_client_ttc ?? 0) - (i.prix_prestataire_ht ?? 0);
                return (
                  <TableRow
                    key={i.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => router.push(`/admin/interventions/${i.id}`)}
                  >
                    <TableCell className="font-medium text-sm whitespace-nowrap">
                      {formatDate(i.date)}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[160px] truncate">
                      {i.logement?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TYPE_LABELS[i.type] ?? i.type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {i.client?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {i.prestataire?.full_name ?? (
                        <span className="italic text-slate-400">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={i.status as InterventionStatus} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {i.status === INTERVENTION_STATUSES.TERMINEE ? (
                        <span className={gain >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatPrix(gain)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* ── Pied de tableau : total gain ────────────────────────────── */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t text-sm">
            <span className="text-muted-foreground">
              {filtered.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE).length} terminée{filtered.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE).length > 1 ? "s" : ""}
            </span>
            <span className="font-semibold">
              Gain total :{" "}
              <span className={totalGain >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPrix(totalGain)}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
