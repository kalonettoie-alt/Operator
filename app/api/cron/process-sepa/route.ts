// app/api/cron/process-sepa/route.ts
//
// POST /api/cron/process-sepa
// Cron job — déclenche automatiquement les prélèvements SEPA pour toutes
// les factures au statut "sent" dont la date d'échéance est atteinte.
//
// Planification Vercel Cron : le 1er et le 16 de chaque mois à 8h UTC.
// Voir vercel.json pour la configuration.
//
// Sécurité : protégé par CRON_SECRET dans l'header Authorization.
//
// Résultat :
//   - Chaque facture éligible passe en "processing" et un PaymentIntent Stripe est créé.
//   - Le webhook Stripe (payment_intent.succeeded / payment_intent.payment_failed)
//     met ensuite à jour le statut en "paid" ou "failed".

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import * as Sentry from "@sentry/nextjs";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface InvoiceEligible {
  id: string;
  invoice_number: string;
  total_ttc: number;
  client_id: string;
  due_date: string | null;
}

interface ClientProfile {
  stripe_customer_id: string | null;
  sepa_mandate_id: string | null;
  sepa_status: string | null;
}

interface ChargeResult {
  invoice_id: string;
  invoice_number: string;
  success: boolean;
  payment_intent_id?: string;
  error?: string;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Vérifier le CRON_SECRET ──────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Client Supabase serveur (service_role, bypass RLS) ───────────────
    const supabase = createServerClient();

    // ── 3. Récupérer toutes les factures éligibles au prélèvement ───────────
    // Éligible = statut "sent" ET due_date <= aujourd'hui
    const todayIso = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    const { data: invoices, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_ttc, client_id, due_date")
      .eq("status", "sent")
      .lte("due_date", todayIso) // due_date atteinte ou dépassée
      .returns<InvoiceEligible[]>();

    if (fetchErr) {
      Sentry.captureException(fetchErr, {
        extra: { context: "Cron process-sepa — récupération des factures éligibles" },
      });
      return NextResponse.json(
        { error: `Erreur récupération factures : ${fetchErr.message}` },
        { status: 500 }
      );
    }

    const eligibles = invoices ?? [];

    // ── 4. Traiter chaque facture en parallèle (max 10 simultanés) ──────────
    const results: ChargeResult[] = [];
    const stripe = getStripe();

    for (const invoice of eligibles) {
      const result = await chargerFacture(supabase, stripe, invoice);
      results.push(result);
    }

    // ── 5. Calculer les statistiques et logger ───────────────────────────────
    const success  = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Logger les erreurs dans Sentry (sans bloquer la réponse)
    if (failures.length > 0) {
      Sentry.captureMessage(
        `Cron process-sepa : ${failures.length} prélèvement(s) en échec`,
        {
          level: "error",
          extra: {
            failures: failures.map((f) => ({
              invoice_id:     f.invoice_id,
              invoice_number: f.invoice_number,
              error:          f.error,
            })),
          },
        }
      );
    }

    return NextResponse.json({
      success:   true,
      date:      todayIso,
      total:     eligibles.length,
      charged:   success.length,
      failed:    failures.length,
      results,
    });

  } catch (error) {
    Sentry.captureException(error, {
      extra: { context: "Cron process-sepa — erreur globale" },
    });
    const message = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Fonction : déclencher le prélèvement pour une facture ───────────────────

async function chargerFacture(
  supabase: ReturnType<typeof createServerClient>,
  stripe: ReturnType<typeof getStripe>,
  invoice: InvoiceEligible
): Promise<ChargeResult> {
  const base: Pick<ChargeResult, "invoice_id" | "invoice_number"> = {
    invoice_id:     invoice.id,
    invoice_number: invoice.invoice_number,
  };

  try {
    // Vérifier le montant
    if (!invoice.total_ttc || invoice.total_ttc <= 0) {
      return { ...base, success: false, error: "Montant invalide ou nul" };
    }

    // Récupérer le profil client (stripe_customer_id + sepa_mandate_id)
    const { data: clientProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("stripe_customer_id, sepa_mandate_id, sepa_status")
      .eq("id", invoice.client_id)
      .single<ClientProfile>();

    if (profileErr || !clientProfile) {
      return { ...base, success: false, error: "Profil client introuvable" };
    }

    if (!clientProfile.stripe_customer_id) {
      return { ...base, success: false, error: "Client sans compte Stripe — mandat SEPA non configuré" };
    }

    if (!clientProfile.sepa_mandate_id) {
      return { ...base, success: false, error: "Client sans mandat SEPA actif" };
    }

    // Récupérer le PaymentMethod SEPA du customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: clientProfile.stripe_customer_id,
      type:     "sepa_debit",
    });

    if (!paymentMethods.data.length) {
      return {
        ...base,
        success: false,
        error:   "Aucun moyen de paiement SEPA trouvé pour ce client",
      };
    }

    const paymentMethodId = paymentMethods.data[0].id;
    const montantCentimes = Math.round(invoice.total_ttc * 100);

    // Créer et confirmer le PaymentIntent SEPA
    const paymentIntent = await stripe.paymentIntents.create({
      amount:               montantCentimes,
      currency:             "eur",
      customer:             clientProfile.stripe_customer_id,
      payment_method:       paymentMethodId,
      payment_method_types: ["sepa_debit"],
      confirm:              true,
      off_session:          true,
      description:          `Facture ${invoice.invoice_number} (prélèvement automatique)`,
      metadata: {
        invoice_id:     invoice.id,
        invoice_number: invoice.invoice_number,
        client_id:      invoice.client_id,
        source:         "cron_process_sepa",
      },
    });

    // Mettre à jour la facture en DB : stripe_payment_intent_id + status = "processing"
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: "processing",
      })
      .eq("id", invoice.id);

    if (updateErr) {
      // Le PaymentIntent existe dans Stripe — logger l'erreur sans bloquer
      Sentry.captureException(updateErr, {
        extra: {
          invoice_id:        invoice.id,
          payment_intent_id: paymentIntent.id,
          context:           "Cron process-sepa — mise à jour DB après création PaymentIntent",
        },
      });
      return {
        ...base,
        success: false,
        error:   `PaymentIntent créé (${paymentIntent.id}) mais erreur DB : ${updateErr.message}`,
      };
    }

    return {
      ...base,
      success:           true,
      payment_intent_id: paymentIntent.id,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Stripe inconnue";
    Sentry.captureException(error, {
      extra: {
        invoice_id:     invoice.id,
        invoice_number: invoice.invoice_number,
        context:        "Cron process-sepa — création PaymentIntent",
      },
    });
    return { ...base, success: false, error: message };
  }
}
