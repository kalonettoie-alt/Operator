"use client";

// Liste des logements du client connecté — lecture seule.
// Le client voit uniquement SES logements (clientId injecté + RLS Supabase).
// Aucun bouton de création/modification/suppression.

import { useAuth } from "@/lib/hooks/useAuth";
import { useLogements } from "@/lib/hooks/useLogements";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Home, Info } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLANCHISSERIE_LABELS: Record<string, string> = {
  fourni: "Linge fourni",
  non_fourni: "Linge non fourni",
  location: "Location linge",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientLogementsPage() {
  const { user } = useAuth();
  const { data: logements, isLoading, error } = useLogements(user?.id);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes logements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? (
            <Skeleton className="inline-block h-4 w-32" />
          ) : (
            `${logements?.length ?? 0} logement${(logements?.length ?? 0) > 1 ? "s" : ""} enregistré${(logements?.length ?? 0) > 1 ? "s" : ""}`
          )}
        </p>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur lors du chargement des logements.
        </div>
      )}

      {/* Vide */}
      {!isLoading && !error && !logements?.length && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Home className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucun logement enregistré pour votre compte.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Contactez votre gestionnaire pour en ajouter.
          </p>
        </div>
      )}

      {/* Liste */}
      {!isLoading && !error && !!logements?.length && (
        <div className="space-y-3">
          {logements.map((logement) => (
            <Card key={logement.id} className="overflow-hidden">
              <CardContent className="p-0">

                {/* Bandeau en-tête */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-gray-900 text-base leading-tight">
                        {logement.name}
                      </h2>
                      {logement.zone && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {logement.zone}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {logement.address}, {logement.postal_code} {logement.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Séparateur + détails */}
                <div className="border-t px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {/* Type blanchisserie */}
                  <div>
                    <p className="text-xs text-muted-foreground">Blanchisserie</p>
                    <p className="text-sm font-medium mt-0.5">
                      {logement.type_blanchisserie
                        ? (BLANCHISSERIE_LABELS[logement.type_blanchisserie] ?? logement.type_blanchisserie)
                        : "—"}
                    </p>
                  </div>

                  {/* Prix ménage */}
                  <div>
                    <p className="text-xs text-muted-foreground">Prix ménage TTC</p>
                    <p className="text-sm font-medium mt-0.5">
                      {logement.prix_client_ttc != null
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(logement.prix_client_ttc)
                        : "—"}
                    </p>
                  </div>

                  {/* Blanchisserie prix */}
                  {logement.prix_blanchisserie != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Prix blanchisserie</p>
                      <p className="text-sm font-medium mt-0.5">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(logement.prix_blanchisserie)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Instructions spéciales — si renseignées */}
                {logement.instructions && (
                  <div className="border-t px-4 py-3">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="size-3.5 mt-0.5 shrink-0" />
                      <p className="leading-relaxed">{logement.instructions}</p>
                    </div>
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
