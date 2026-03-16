"use client";

// Page : Facturation admin
// Permet de générer les factures draft pour une période donnée (1-15 ou 16-fin)
// et d'afficher la liste de toutes les factures existantes.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Zap, ChevronLeft, ChevronRight, Send, Loader2, CheckCircle2, XCircle, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useInvoices, useGenerateInvoices, useSendInvoice, useChargeInvoice } from "@/lib/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 2,
  }).format(value);
}

// Dernier jour d'un mois donné
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// YYYY-MM-DD à partir de composants
function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Badge statut facture ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:      { label: "Brouillon",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  sent:       { label: "Envoyée",     className: "bg-blue-50 text-blue-700 border-blue-200" },
  processing: { label: "En cours",    className: "bg-purple-50 text-purple-700 border-purple-200" },
  paid:       { label: "Payée",       className: "bg-green-50 text-green-700 border-green-200" },
  overdue:    { label: "En retard",   className: "bg-orange-50 text-orange-700 border-orange-200" },
  cancelled:  { label: "Annulée",     className: "bg-slate-50 text-slate-500 border-slate-200 line-through" },
  failed:     { label: "Échouée",     className: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Indicateur statut Stripe ─────────────────────────────────────────────────

interface StripeStatus {
  connected:   boolean;
  mode?:       "test" | "live";
  account_id?: string;
  sepa_enabled?: boolean;
}

function useStripeStatus() {
  return useQuery<StripeStatus>({
    queryKey: ["stripe-status"],
    // Vérifier une fois au chargement, pas besoin de re-fetch automatique
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const res = await fetch("/api/stripe/test", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json() as StripeStatus & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur Stripe");
      return data;
    },
  });
}

function StripeStatusIndicator() {
  const { data, isLoading, error } = useStripeStatus();

  if (isLoading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Vérification Stripe…
      </span>
    );
  }

  if (error || !data?.connected) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
        <XCircle className="size-4" />
        Stripe non connecté
      </span>
    );
  }

  const isTest = data.mode === "test";
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${isTest ? "text-amber-600" : "text-green-600"}`}>
      {isTest
        ? <AlertCircle className="size-4" />
        : <CheckCircle2 className="size-4" />}
      Stripe connecté
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 h-4 ${
          isTest
            ? "border-amber-300 text-amber-600 bg-amber-50"
            : "border-green-300 text-green-600 bg-green-50"
        }`}
      >
        {isTest ? "TEST" : "LIVE"}
      </Badge>
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <Badge variant="outline" className={`text-xs border ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// ─── Sélecteur de période ─────────────────────────────────────────────────────

type PeriodeMode = "premiere_quinzaine" | "deuxieme_quinzaine" | "personnalisee";

interface PeriodeSelectorProps {
  periodStart: string;
  periodEnd: string;
  onChangePeriod: (start: string, end: string) => void;
}

function PeriodeSelector({ periodStart, periodEnd, onChangePeriod }: PeriodeSelectorProps) {
  const now = new Date();
  const [navYear, setNavYear] = useState(now.getFullYear());
  const [navMonth, setNavMonth] = useState(now.getMonth() + 1); // 1-12
  const [mode, setMode] = useState<PeriodeMode>("premiere_quinzaine");

  // Nom du mois navigué
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })
    .format(new Date(navYear, navMonth - 1, 1));

  function applyPeriod(m: PeriodeMode, y: number, mo: number) {
    const last = lastDayOfMonth(y, mo);
    if (m === "premiere_quinzaine") {
      onChangePeriod(toIsoDate(y, mo, 1), toIsoDate(y, mo, 15));
    } else if (m === "deuxieme_quinzaine") {
      onChangePeriod(toIsoDate(y, mo, 16), toIsoDate(y, mo, last));
    }
    // personnalisee : ne pas écraser, l'utilisateur saisit manuellement
  }

  function setModeAndApply(m: PeriodeMode) {
    setMode(m);
    if (m !== "personnalisee") applyPeriod(m, navYear, navMonth);
  }

  function prevMonth() {
    const newMonth = navMonth === 1 ? 12 : navMonth - 1;
    const newYear  = navMonth === 1 ? navYear - 1 : navYear;
    setNavMonth(newMonth);
    setNavYear(newYear);
    if (mode !== "personnalisee") applyPeriod(mode, newYear, newMonth);
  }

  function nextMonth() {
    const newMonth = navMonth === 12 ? 1 : navMonth + 1;
    const newYear  = navMonth === 12 ? navYear + 1 : navYear;
    setNavMonth(newMonth);
    setNavYear(newYear);
    if (mode !== "personnalisee") applyPeriod(mode, newYear, newMonth);
  }

  return (
    <div className="space-y-3">
      {/* Navigation mois */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth} className="size-8">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold capitalize min-w-[160px] text-center">
          {monthLabel}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth} className="size-8">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Boutons de sélection de période */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={mode === "premiere_quinzaine" ? "default" : "outline"}
          onClick={() => setModeAndApply("premiere_quinzaine")}
        >
          1 – 15
        </Button>
        <Button
          size="sm"
          variant={mode === "deuxieme_quinzaine" ? "default" : "outline"}
          onClick={() => setModeAndApply("deuxieme_quinzaine")}
        >
          16 – fin du mois
        </Button>
        <Button
          size="sm"
          variant={mode === "personnalisee" ? "default" : "outline"}
          onClick={() => setModeAndApply("personnalisee")}
        >
          Personnalisée
        </Button>
      </div>

      {/* Champs de dates manuels (mode personnalisé) */}
      {mode === "personnalisee" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date début</label>
            <Input
              type="date"
              className="w-40"
              value={periodStart}
              onChange={(e) => onChangePeriod(e.target.value, periodEnd)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date fin</label>
            <Input
              type="date"
              className="w-40"
              value={periodEnd}
              onChange={(e) => onChangePeriod(periodStart, e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Résumé de la période sélectionnée */}
      {periodStart && periodEnd && (
        <p className="text-sm text-muted-foreground">
          Période sélectionnée :{" "}
          <span className="font-medium text-foreground">
            {formatDate(periodStart)} → {formatDate(periodEnd)}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FacturationPage() {
  // Période par défaut : 1ère quinzaine du mois courant
  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [periodStart, setPeriodStart] = useState(toIsoDate(year, month, 1));
  const [periodEnd,   setPeriodEnd]   = useState(toIsoDate(year, month, 15));

  function handleChangePeriod(start: string, end: string) {
    setPeriodStart(start);
    setPeriodEnd(end);
  }

  // Données
  const router = useRouter();
  const { data: invoices, isLoading, error } = useInvoices();
  const generateMutation = useGenerateInvoices();
  const sendMutation = useSendInvoice();
  const chargeMutation = useChargeInvoice();

  async function handleSendInvoice(e: React.MouseEvent, invoiceId: string) {
    // Empêche le clic de propager vers la ligne (navigation)
    e.stopPropagation();
    try {
      await sendMutation.mutateAsync(invoiceId);
      toast.success("Facture envoyée par email au client");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
      Sentry.captureException(err);
    }
  }

  async function handleChargeInvoice(e: React.MouseEvent, invoiceId: string) {
    // Empêche le clic de propager vers la ligne (navigation)
    e.stopPropagation();
    try {
      await chargeMutation.mutateAsync(invoiceId);
      toast.success("Prélèvement SEPA déclenché — le paiement sera confirmé dans 5 à 14 jours");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du prélèvement");
      Sentry.captureException(err);
    }
  }

  async function handleGenerate() {
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      toast.error("Période invalide : la date de début doit être avant la date de fin");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({ period_start: periodStart, period_end: periodEnd });

      if (result.created === 0 && result.skipped === 0) {
        toast.info(result.message ?? "Aucune intervention terminée sur cette période");
        return;
      }

      if (result.created > 0) {
        toast.success(
          `${result.created} facture${result.created > 1 ? "s" : ""} créée${result.created > 1 ? "s" : ""} en brouillon` +
          (result.skipped > 0 ? ` (${result.skipped} déjà existante${result.skipped > 1 ? "s" : ""})` : "")
        );
      } else if (result.skipped > 0) {
        toast.info(`${result.skipped} facture${result.skipped > 1 ? "s" : ""} déjà générée${result.skipped > 1 ? "s" : ""} pour cette période`);
      }

      if (result.errors?.length > 0) {
        toast.error(`${result.errors.length} erreur(s) lors de la génération — voir Sentry`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération");
      Sentry.captureException(err);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Facturation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Générez les factures clients pour une période donnée, puis suivez leur statut.
          </p>
        </div>
        <StripeStatusIndicator />
      </div>

      {/* Carte génération */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-amber-500" />
            Générer les factures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélecteur de période */}
          <PeriodeSelector
            periodStart={periodStart}
            periodEnd={periodEnd}
            onChangePeriod={handleChangePeriod}
          />

          {/* Règles de facturation (aide visuelle) */}
          <div className="rounded-md bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Règles appliquées :</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Seules les interventions au statut <strong>Terminée</strong> sont facturées</li>
              <li>Une ligne <em>Ménage</em> par intervention (prix client TTC)</li>
              <li>Une ligne <em>Blanchisserie</em> si <code>blanchisserie_incluse = true</code></li>
              <li>Anti-doublon : une facture déjà existante pour (client × période) est ignorée</li>
            </ul>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !periodStart || !periodEnd}
            className="min-w-[180px]"
          >
            {generateMutation.isPending ? (
              <>Génération en cours…</>
            ) : (
              <>
                <FileText className="size-4 mr-2" />
                Générer les factures
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Toutes les factures
            {!isLoading && !error && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({invoices?.length ?? 0})
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-destructive text-sm">
            Erreur lors du chargement des factures.
          </div>
        ) : !invoices?.length ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Aucune facture générée pour l&apos;instant.
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Ménage</TableHead>
                  <TableHead className="text-right">Blanchisserie</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/admin/facturation/${invoice.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.client?.full_name ?? (
                        <span className="text-muted-foreground text-xs">Client inconnu</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm whitespace-nowrap">
                      {formatDate(invoice.period_start)} → {formatDate(invoice.period_end)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrix(invoice.total_menage)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {invoice.total_blanchisserie
                        ? formatPrix(invoice.total_blanchisserie)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatPrix(invoice.total_ttc)}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    {/* Actions rapides par statut */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* Envoi rapide — brouillons uniquement */}
                        {invoice.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                            onClick={(e) => handleSendInvoice(e, invoice.id)}
                            disabled={sendMutation.isPending || chargeMutation.isPending}
                            title="Valider et envoyer par email"
                          >
                            {sendMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                          </Button>
                        )}
                        {/* Prélever — factures envoyées uniquement */}
                        {invoice.status === "sent" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-purple-700 border-purple-300 hover:bg-purple-50"
                            onClick={(e) => handleChargeInvoice(e, invoice.id)}
                            disabled={chargeMutation.isPending || sendMutation.isPending}
                            title="Déclencher le prélèvement SEPA"
                          >
                            {chargeMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
