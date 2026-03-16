// app/api/stripe/charge/route.ts
//
// POST /api/stripe/charge
// Authentification : Bearer token Supabase + rôle admin.
//
// Corps : { invoice_id: string }
//
// Enchaîne :
//   1. Vérifie que la facture est au statut "sent"
//   2. Récupère le stripe_customer_id et le sepa_mandate_id du client
//   3. Récupère la liste des moyens de paiement SEPA du customer Stripe
//   4. Crée et confirme un PaymentIntent SEPA Direct Debit
//   5. Met à jour invoice.stripe_payment_intent_id et invoice.status = "processing"
//   6. Retourne { success, payment_intent_id, status }
//
// Note : Le prélèvement SEPA prend 5 à 14 jours ouvrés.
// Le statut "processing" sera mis à jour vers "paid" ou "failed"
// par le webhook Stripe (stripe/webhook).

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authentification Bearer ─────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // ── 2. Vérifier le rôle admin ──────────────────────────────────────────────
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // ── 3. Récupérer et valider la facture ─────────────────────────────────────
    const body = await request.json() as { invoice_id?: string };
    const { invoice_id } = body;
    if (!invoice_id) {
      return NextResponse.json({ error: "invoice_id requis" }, { status: 400 });
    }

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total_ttc, client_id, stripe_payment_intent_id")
      .eq("id", invoice_id)
      .single();

    if (invoiceErr || !invoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Seules les factures envoyées peuvent être prélevées
    if (invoice.status !== "sent") {
      return NextResponse.json(
        { error: `Impossible de prélever une facture au statut "${invoice.status}" — seules les factures "sent" peuvent être prélevées` },
        { status: 422 }
      );
    }

    const montantTtc = invoice.total_ttc;
    if (!montantTtc || montantTtc <= 0) {
      return NextResponse.json({ error: "Le montant de la facture est invalide" }, { status: 422 });
    }

    // ── 4. Récupérer le profil client (stripe_customer_id + sepa_mandate_id) ──
    const { data: clientProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, full_name, stripe_customer_id, sepa_mandate_id, sepa_status")
      .eq("id", invoice.client_id)
      .single();

    if (profileErr || !clientProfile) {
      return NextResponse.json({ error: "Profil client introuvable" }, { status: 404 });
    }

    if (!clientProfile.stripe_customer_id) {
      return NextResponse.json(
        { error: "Ce client n'a pas de compte Stripe — configurez d'abord son mandat SEPA" },
        { status: 422 }
      );
    }

    if (!clientProfile.sepa_mandate_id) {
      return NextResponse.json(
        { error: "Ce client n'a pas de mandat SEPA actif — configurez d'abord son mandat SEPA" },
        { status: 422 }
      );
    }

    // ── 5. Récupérer le PaymentMethod SEPA associé au mandat ──────────────────
    const stripe = getStripe();

    // Lister les PaymentMethods SEPA du customer pour récupérer le bon
    const paymentMethods = await stripe.paymentMethods.list({
      customer: clientProfile.stripe_customer_id,
      type: "sepa_debit",
    });

    if (!paymentMethods.data.length) {
      return NextResponse.json(
        { error: "Aucun moyen de paiement SEPA trouvé pour ce client — configurez d'abord son mandat" },
        { status: 422 }
      );
    }

    // Utiliser le premier PaymentMethod SEPA (le plus récent)
    const paymentMethodId = paymentMethods.data[0].id;

    // ── 6. Créer et confirmer le PaymentIntent SEPA ───────────────────────────
    // Le montant est en centimes (Stripe attend des entiers)
    const montantCentimes = Math.round(montantTtc * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:               montantCentimes,
      currency:             "eur",
      customer:             clientProfile.stripe_customer_id,
      payment_method:       paymentMethodId,
      payment_method_types: ["sepa_debit"],
      // Confirmation immédiate (off_session = sans interaction du client)
      confirm:              true,
      off_session:          true,
      // Mandat SEPA associé
      mandate:              clientProfile.sepa_mandate_id,
      description:          `Facture ${invoice.invoice_number}`,
      metadata: {
        invoice_id:       invoice.id,
        invoice_number:   invoice.invoice_number,
        client_id:        invoice.client_id,
      },
    });

    // ── 7. Mettre à jour la facture en DB ──────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        // SEPA prend 5–14 jours : on passe en "processing" en attendant la confirmation
        status: "processing",
      })
      .eq("id", invoice_id);

    if (updateErr) {
      // Le PaymentIntent existe dans Stripe — logger l'erreur mais ne pas bloquer
      Sentry.captureException(updateErr, {
        extra: {
          invoice_id,
          payment_intent_id: paymentIntent.id,
          context: "Mise à jour DB après création PaymentIntent réussie",
        },
      });
      return NextResponse.json(
        { error: "Prélèvement créé dans Stripe mais erreur de mise à jour en base de données — contactez le support" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success:           true,
      payment_intent_id: paymentIntent.id,
      status:            paymentIntent.status,
      amount_eur:        montantTtc,
    });

  } catch (error) {
    Sentry.captureException(error);
    // Erreur Stripe explicite (ex : mandat expiré, solde insuffisant)
    const message = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
