"use client";

// Page : Fiche détail client (admin)
// Affiche les informations du client et permet de configurer un mandat SEPA.
//
// Flux SEPA :
//   1. Admin clique "Configurer SEPA"
//   2. Appel POST /api/stripe/create-setup-intent → client_secret
//   3. Stripe.js confirme le SetupIntent avec l'IBAN saisi
//   4. Appel POST /api/stripe/confirm-mandate → sauvegarde en BDD
//   5. Badge SEPA passe à "Actif"

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CreditCard, CheckCircle2, XCircle, Clock,
  Loader2, Building2, Mail, Phone, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useClient } from "@/lib/hooks/useProfiles";
import { supabase } from "@/lib/supabase/client";
import { getStripePromise } from "@/lib/stripe/frontend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Badge statut SEPA ────────────────────────────────────────────────────────

function SepaBadge({ status }: { status: string | null }) {
  if (!status || status === "none") {
    return (
      <Badge variant="outline" className="gap-1.5 border-slate-200 text-slate-500">
        <XCircle className="size-3" />
        Non configuré
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-200 text-amber-600 bg-amber-50">
        <Clock className="size-3" />
        En attente
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge variant="outline" className="gap-1.5 border-green-200 text-green-700 bg-green-50">
        <CheckCircle2 className="size-3" />
        Actif
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 border-red-200 text-red-600 bg-red-50">
      <XCircle className="size-3" />
      {status}
    </Badge>
  );
}

// ─── Modal de configuration SEPA ─────────────────────────────────────────────

interface SepaDialogProps {
  open:      boolean;
  onClose:   () => void;
  clientId:  string;
  clientName: string;
  clientEmail: string;
}

function SepaDialog({ open, onClose, clientId, clientName, clientEmail }: SepaDialogProps) {
  const queryClient = useQueryClient();
  const [iban, setIban]       = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    const ibanClean = iban.replace(/\s/g, "").toUpperCase();
    if (!ibanClean) {
      toast.error("Veuillez saisir un IBAN");
      return;
    }

    setLoading(true);
    try {
      // 1. Récupérer le token de session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée — veuillez vous reconnecter");

      // 2. Créer le SetupIntent côté serveur
      const siRes = await fetch("/api/stripe/create-setup-intent", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client_id: clientId }),
      });
      const siData = await siRes.json() as { client_secret?: string; error?: string };
      if (!siRes.ok) throw new Error(siData.error ?? "Erreur création SetupIntent");

      const { client_secret } = siData;
      if (!client_secret) throw new Error("client_secret manquant");

      // 3. Charger Stripe.js et confirmer le SetupIntent avec l'IBAN
      const stripe = await getStripePromise();
      if (!stripe) throw new Error("Stripe.js non disponible — vérifier NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

      const { setupIntent, error: stripeError } = await stripe.confirmSepaDebitSetup(
        client_secret,
        {
          payment_method: {
            sepa_debit:      { iban: ibanClean },
            billing_details: { name: clientName, email: clientEmail },
          },
        }
      );

      if (stripeError) throw new Error(stripeError.message ?? "Erreur confirmation SEPA");
      if (!setupIntent) throw new Error("SetupIntent introuvable après confirmation");

      const paymentMethodId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id ?? "";

      // 4. Sauvegarder le mandat en base via l'API
      // Le mandate_id est récupéré côté serveur depuis la PaymentMethod
      const saveRes = await fetch("/api/stripe/confirm-mandate", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          client_id:         clientId,
          payment_method_id: paymentMethodId,
        }),
      });
      const saveData = await saveRes.json() as { success?: boolean; error?: string };
      if (!saveRes.ok) throw new Error(saveData.error ?? "Erreur sauvegarde mandat");

      // 5. Rafraîchir le profil dans le cache
      queryClient.invalidateQueries({ queryKey: ["profiles", clientId] });

      toast.success("Mandat SEPA configuré avec succès");
      onClose();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la configuration SEPA");
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && !loading) {
      setIban("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            Configurer le prélèvement SEPA
          </DialogTitle>
          <DialogDescription>
            Le client <strong>{clientName}</strong> autorisera les prélèvements automatiques
            sur le compte bancaire ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              disabled={loading}
              className="font-mono text-sm tracking-wider"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Test Stripe : <span className="font-mono">FR7630006000011234567890189</span>
            </p>
          </div>

          {/* Mention légale mandat SEPA */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground leading-relaxed">
            En confirmant, vous autorisez <strong>Deltom</strong> à envoyer des instructions
            à la banque du débiteur pour débiter son compte conformément aux instructions.
            Le débiteur bénéficie du droit à un remboursement selon les conditions de son
            accord avec sa banque.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !iban.trim()}>
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Confirmation…</>
            ) : (
              <><CreditCard className="size-4 mr-2" />Confirmer le mandat</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: client, isLoading, error } = useClient(id);
  const [sepaDialogOpen, setSepaDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-muted-foreground text-sm">
        <Loader2 className="size-5 mr-2 animate-spin" />
        Chargement du client…
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/admin/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />Retour
          </Button>
        </Link>
        <p className="text-destructive text-sm">Client introuvable ou erreur de chargement.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Navigation */}
      <Link href="/admin/clients">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="size-4 mr-2" />
          Retour aux clients
        </Button>
      </Link>

      {/* En-tête */}
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg flex-shrink-0">
          {client.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{client.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{client.email}</p>
        </div>
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground flex-shrink-0" />
            <span>{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.company_name && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 text-muted-foreground flex-shrink-0" />
              <span>{client.company_name}</span>
            </div>
          )}
          {client.zone && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground flex-shrink-0" />
              <Badge variant="secondary">{client.zone}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section SEPA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              Prélèvement SEPA
            </CardTitle>
            <SepaBadge status={client.sepa_status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Résumé si mandat actif */}
          {client.sepa_status === "active" && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 border border-green-100 text-sm text-green-800">
              <CheckCircle2 className="size-4 flex-shrink-0" />
              <span>
                Mandat actif — IBAN se terminant par{" "}
                <strong className="font-mono">••••{client.iban_last4}</strong>
              </span>
            </div>
          )}

          {/* Identifiants Stripe (pour débogage) */}
          {client.stripe_customer_id && (
            <div className="text-xs text-muted-foreground font-mono space-y-1">
              <p>Customer : {client.stripe_customer_id}</p>
              {client.sepa_mandate_id && (
                <p>Mandat : {client.sepa_mandate_id}</p>
              )}
            </div>
          )}

          {/* Bouton de configuration */}
          <Button
            onClick={() => setSepaDialogOpen(true)}
            variant={client.sepa_status === "active" ? "outline" : "default"}
            size="sm"
          >
            <CreditCard className="size-4 mr-2" />
            {client.sepa_status === "active" ? "Modifier le mandat SEPA" : "Configurer SEPA"}
          </Button>
        </CardContent>
      </Card>

      {/* Modal SEPA */}
      <SepaDialog
        open={sepaDialogOpen}
        onClose={() => setSepaDialogOpen(false)}
        clientId={client.id}
        clientName={client.full_name}
        clientEmail={client.email}
      />
    </div>
  );
}
