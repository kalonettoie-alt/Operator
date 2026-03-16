"use client";

// Page : Mes factures (espace client)
// Affiche toutes les factures du client connecté.
// La sécurité (RLS) garantit que le client ne voit que ses propres factures.
// Chaque facture dispose d'un bouton de téléchargement PDF si disponible.

import { Download, Receipt, Loader2 } from "lucide-react";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(value);
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: "En cours",   className: "bg-slate-100 text-slate-600 border-slate-200" },
  sent:      { label: "À régler",   className: "bg-amber-50 text-amber-700 border-amber-200"  },
  paid:      { label: "Payée",      className: "bg-green-50 text-green-700 border-green-200"  },
  overdue:   { label: "En retard",  className: "bg-red-50 text-red-700 border-red-200"        },
  cancelled: { label: "Annulée",    className: "bg-slate-50 text-slate-400 border-slate-200 line-through" },
  failed:    { label: "Échouée",    className: "bg-red-50 text-red-700 border-red-200"        },
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

export default function ClientFacturesPage() {
  // RLS garantit que seules les factures du client connecté sont retournées
  const { data: invoices, isLoading, error } = useInvoices();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-muted-foreground text-sm">
        <Loader2 className="size-5 mr-2 animate-spin" />
        Chargement de vos factures…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">Erreur lors du chargement des factures.</p>
      </div>
    );
  }

  // Ne montrer que les factures envoyées, payées ou en retard
  // (les brouillons sont internes à l'admin)
  const visibleInvoices = (invoices ?? []).filter(
    (inv) => inv.status !== "draft" && inv.status !== "cancelled"
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Receipt className="size-5 text-muted-foreground" />
          Mes factures
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Retrouvez ici toutes vos factures de prestations.
        </p>
      </div>

      {/* État vide */}
      {visibleInvoices.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Receipt className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Vos factures apparaîtront ici dès qu&apos;elles auront été émises.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Liste des factures */}
      {visibleInvoices.length > 0 && (
        <div className="space-y-3">
          {visibleInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">

                  {/* Informations principales */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">
                        {invoice.invoice_number}
                      </span>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>

                    {/* Période */}
                    <p className="text-sm text-muted-foreground mt-1">
                      Période : {formatDate(invoice.period_start)} → {formatDate(invoice.period_end)}
                    </p>

                    {/* Échéance — mise en rouge si en retard */}
                    {invoice.due_date && (
                      <p className={`text-xs mt-0.5 ${
                        invoice.status === "overdue"
                          ? "text-red-600 font-medium"
                          : "text-muted-foreground"
                      }`}>
                        Échéance : {formatDate(invoice.due_date)}
                      </p>
                    )}
                  </div>

                  {/* Montant + bouton téléchargement */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-semibold tabular-nums">
                      {formatPrix(invoice.total_ttc)}
                    </span>

                    {invoice.pdf_url ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Télécharger la facture ${invoice.invoice_number}`}
                        >
                          <Download className="size-4 mr-1.5" />
                          Télécharger
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <Download className="size-4 mr-1.5" />
                        PDF indisponible
                      </Button>
                    )}
                  </div>
                </div>

                {/* Détail des montants si blanchisserie */}
                {invoice.total_blanchisserie != null && invoice.total_blanchisserie > 0 && (
                  <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
                    <span>Ménage : {formatPrix(invoice.total_menage ?? 0)}</span>
                    <span>Blanchisserie : {formatPrix(invoice.total_blanchisserie)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
