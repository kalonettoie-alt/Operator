// app/api/stripe/confirm-mandate/route.ts
//
// POST /api/stripe/confirm-mandate
// Authentification : Bearer token Supabase + rôle admin.
//
// Appelé APRÈS que le frontend a confirmé le SetupIntent avec succès.
// Corps : { client_id: string, payment_method_id: string, mandate_id: string }
//
// Met à jour le profil client :
//   - sepa_mandate_id  ← mandate_id (ID du mandat Stripe)
//   - sepa_status      ← 'active'
//   - iban_last4       ← récupéré depuis la PaymentMethod Stripe

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentification Bearer
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

    // 2. Vérifier le rôle admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 3. Valider le corps
    const body = await request.json() as {
      client_id?:         string;
      payment_method_id?: string;
    };
    const { client_id, payment_method_id } = body;

    if (!client_id || !payment_method_id) {
      return NextResponse.json(
        { error: "client_id et payment_method_id sont requis" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // 4. Récupérer les détails de la PaymentMethod (last4 + customer)
    const pm = await stripe.paymentMethods.retrieve(payment_method_id);
    const ibanLast4 = pm.sepa_debit?.last4 ?? null;

    // 5. Trouver le mandate_id via les SetupIntents liés à cette PaymentMethod
    //    (le plus récent avec statut succeeded)
    let mandateId: string | null = null;
    try {
      const setupIntents = await stripe.setupIntents.list({
        limit: 5,
      });
      const matched = setupIntents.data.find(
        (si) =>
          si.payment_method === payment_method_id &&
          si.status === "succeeded"
      );
      if (matched?.mandate) {
        mandateId = typeof matched.mandate === "string"
          ? matched.mandate
          : matched.mandate.id;
      }
    } catch {
      // Non bloquant — on peut continuer sans le mandate_id
    }

    // 6. Mettre à jour le profil client
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        sepa_mandate_id:    mandateId,
        sepa_status:        "active",
        iban_last4:         ibanLast4,
        stripe_customer_id: pm.customer as string | null,
      })
      .eq("id", client_id);

    if (updateErr) {
      throw new Error(`Erreur mise à jour profil : ${updateErr.message}`);
    }

    return NextResponse.json({ success: true, iban_last4: ibanLast4 });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
