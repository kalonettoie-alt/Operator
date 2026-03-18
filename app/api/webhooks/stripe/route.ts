// app/api/webhooks/stripe/route.ts
//
// POST /api/webhooks/stripe
// Reçoit les événements Stripe et met à jour les factures en conséquence.
//
// Événements gérés :
//   - payment_intent.succeeded    → invoice.status = "paid",  paid_at = now()
//   - payment_intent.payment_failed → invoice.status = "failed", failure_count++
//
// Sécurité : la signature du webhook est TOUJOURS vérifiée avec STRIPE_WEBHOOK_SECRET.
// Sans cela, n'importe qui pourrait falsifier un événement "payment succeeded".
//
// Configuration Stripe Dashboard :
//   URL : https://<votre-domaine>/api/webhooks/stripe
//   Événements à écouter : payment_intent.succeeded, payment_intent.payment_failed

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";

// Next.js App Router : désactiver le bodyParser pour pouvoir lire le raw body
// (requis par Stripe pour vérifier la signature)
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ── 1. Lire le body brut (nécessaire pour la vérification de signature) ───
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    Sentry.captureMessage("STRIPE_WEBHOOK_SECRET manquant — webhook non configuré", "error");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  // ── 2. Vérifier la signature Stripe ───────────────────────────────────────
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // Signature invalide = tentative de falsification ou mauvais secret
    Sentry.captureException(err, { extra: { context: "Vérification signature webhook Stripe" } });
    const message = err instanceof Error ? err.message : "Signature invalide";
    return NextResponse.json({ error: `Signature invalide : ${message}` }, { status: 400 });
  }

  // ── 3. Dispatcher selon le type d'événement ───────────────────────────────
  const supabase = createServerClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      default:
        // Événement ignoré — Stripe attend toujours un 200
        break;
    }
  } catch (err) {
    Sentry.captureException(err, {
      extra: {
        event_type: event.type,
        event_id:   event.id,
      },
    });
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  // Stripe exige un 200 pour confirmer la réception
  return NextResponse.json({ received: true });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * payment_intent.succeeded
 * Le prélèvement SEPA a été confirmé → la facture passe en "paid".
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createServerClient>
) {
  const invoiceId = paymentIntent.metadata?.invoice_id;

  if (!invoiceId) {
    // PaymentIntent non lié à une facture (ex: autre flux Stripe) — ignorer
    return;
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status:  "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    // Sécurité : ne mettre à jour que si le payment_intent correspond bien
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (error) {
    throw new Error(`Erreur DB payment_intent.succeeded (invoice ${invoiceId}) : ${error.message}`);
  }
}

/**
 * payment_intent.payment_failed
 * Le prélèvement SEPA a échoué → la facture passe en "failed", failure_count++.
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createServerClient>
) {
  const invoiceId = paymentIntent.metadata?.invoice_id;

  if (!invoiceId) {
    return;
  }

  // Récupérer le failure_count actuel pour l'incrémenter
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("failure_count")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !invoice) {
    throw new Error(`Facture introuvable pour payment_intent.payment_failed (invoice ${invoiceId})`);
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status:        "failed",
      failure_count: (invoice.failure_count ?? 0) + 1,
    })
    .eq("id", invoiceId)
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (error) {
    throw new Error(`Erreur DB payment_intent.payment_failed (invoice ${invoiceId}) : ${error.message}`);
  }
}
