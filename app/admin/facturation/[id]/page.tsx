"use client";

// Page : Détail d'une facture (admin)
// Affiche les lignes de la facture, les montants et le client.
// Permet de générer le PDF et de le télécharger.

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { useInvoice, useGeneratePdf, useSendInvoice } from "@/lib/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(value);
}

// Libellé lisible par type de ligne
const TYPE_LABELS: Record<string, string> = {
  menage:                     "Ménage",
  blanchisserie_intervention: "Blanchisserie (intervention)",
  blanchisserie_forfait:      "Blanchisserie forfait",
};

// ─── Badge statut ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: "Brouillon",  className: "bg-slate-100 text-slate-700 border-slate-200" },
  sent:      { label: "Envoyée",    className: "bg-blue-50 text-blue-700 border-blue-200" },
  paid:      { label: "Payée",      className: "bg-green-50 text-green-700 border-green-200" },
  overdue:   { label: "En retard",  className: "bg-orange-50 text-orange-700 border-orange-200" },
  cancelled: { label: "Annulée",    className: "bg-slate-50 text-slate-500 border-slate-200 line-through" },
  failed:    { label: "Échouée",    className: "bg-red-50 text-red-700 border-red-200" },
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <Badge variant="outline" className={`text-xs border ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: invoice, isLoading, error } = useInvoice(id);
  const generatePdf = useGeneratePdf();
  const sendInvoice = useSendInvoice();

  async function handleGeneratePdf() {
    try {
      const result = await generatePdf.mutateAsync(id);
      toast.success("PDF généré avec succès");
      window.open(result.pdf_url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération du PDF");
      Sentry.captureException(err);
    }
  }

  async function handleSendInvoice() {
    try {
      await sendInvoice.mutateAsync(id);
      toast.success("Facture validée et envoyée par email au client");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de la facture");
      Sentry.captureException(err);
    }
  }

  // ─── États de chargement ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-muted-foreground text-sm">
        <Loader2 className="size-5 mr-2 animate-spin" />
        Chargement de la facture…
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/admin/facturation">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Retour
          </Button>
        </Link>
        <p className="text-destructive text-sm">Facture introuvable ou erreur de chargement.</p>
      </div>
    );
  }

  const lines = invoice.lines ?? [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/admin/facturation">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Retour
          </Button>
        </Link>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono">{invoice.invoice_number}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {invoice.client?.full_name ?? "Client inconnu"} ·{" "}
            Période : {formatDate(invoice.period_start)} → {formatDate(invoice.period_end)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {invoice.pdf_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="size-4 mr-2" />
                Télécharger PDF
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={generatePdf.isPending || sendInvoice.isPending}
          >
            {generatePdf.isPending ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Génération…</>
            ) : (
              <><FileText className="size-4 mr-2" />{invoice.pdf_url ? "Regénérer PDF" : "Générer PDF"}</>
            )}
          </Button>
          {/* Bouton "Valider et envoyer" — visible uniquement sur les brouillons */}
          {invoice.status === "draft" && (
            <Button
              size="sm"
              onClick={handleSendInvoice}
              disabled={sendInvoice.isPending || generatePdf.isPending}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              {sendInvoice.isPending ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Envoi en cours…</>
              ) : (
                <><Send className="size-4 mr-2" />Valider et envoyer</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Infos facture */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Client</p>
            <p className="text-sm font-medium mt-0.5">
              {invoice.client?.full_name ?? "—"}
            </p>
            {invoice.client?.email && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{invoice.client.email}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Date d&apos;émission</p>
            <p className="text-sm font-medium mt-0.5">
              {invoice.created_at ? formatDate(invoice.created_at) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Échéance</p>
            <p className="text-sm font-medium mt-0.5">
              {invoice.due_date ? formatDate(invoice.due_date) : "—"}
            </p>
            {invoice.sent_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Envoyée le {formatDate(invoice.sent_at)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total TTC</p>
            <p className="text-lg font-semibold mt-0.5 tabular-nums">
              {formatPrix(invoice.total_ttc)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lignes de facture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            Détail des prestations
            <span className="text-sm font-normal text-muted-foreground">
              ({lines.length} ligne{lines.length > 1 ? "s" : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune ligne de facture.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-16">Qté</TableHead>
                  <TableHead className="text-right w-28">Prix unitaire</TableHead>
                  <TableHead className="text-right w-28">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines
                  .slice()
                  .sort((a, b) => {
                    const order: Record<string, number> = {
                      menage: 0,
                      blanchisserie_intervention: 1,
                      blanchisserie_forfait: 2,
                    };
                    return (order[a.type] ?? 9) - (order[b.type] ?? 9);
                  })
                  .map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
                          {TYPE_LABELS[line.type] ?? line.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {line.description}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {line.quantity ?? 1}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatPrix(line.unit_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {formatPrix(line.total)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Récapitulatif des totaux */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2 max-w-xs ml-auto">
            {invoice.total_menage !== null && invoice.total_menage !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ménage</span>
                <span className="tabular-nums">{formatPrix(invoice.total_menage)}</span>
              </div>
            )}
            {invoice.total_blanchisserie ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Blanchisserie</span>
                <span className="tabular-nums">{formatPrix(invoice.total_blanchisserie)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>TVA non applicable (art. 293 B CGI)</span>
              <span>—</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-2">
              <span>Total TTC</span>
              <span className="tabular-nums">{formatPrix(invoice.total_ttc)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
