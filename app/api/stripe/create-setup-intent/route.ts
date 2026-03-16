// app/api/stripe/create-setup-intent/route.ts
//
// POST /api/stripe/create-setup-intent
// Authentification : Bearer token Supabase + rôle admin.
//
// Corps : { client_id: string }
//
// Enchaîne :
//   1. Récupère le profil client (email, nom, stripe_customer_id existant)
//   2. Crée un Customer Stripe si aucun n'existe encore
//   3. Sauvegarde stripe_customer_id sur le profil si nouveau
//   4. Crée un SetupIntent SEPA Direct Debit lié au Customer
//   5. Retourne { client_secret, customer_id }

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

    // 3. Récupérer le profil du client cible
    const body = await request.json() as { client_id?: string };
    const { client_id } = body;
    if (!client_id) {
      return NextResponse.json({ error: "client_id requis" }, { status: 400 });
    }

    const { data: clientProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, stripe_customer_id")
      .eq("id", client_id)
      .eq("role", "client")
      .single();

    if (profileErr || !clientProfile) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    const stripe = getStripe();
    let customerId = clientProfile.stripe_customer_id;

    // 4. Créer le Customer Stripe si absent
    if (!customerId) {
      const customer = await stripe.customers.create({
        name:     clientProfile.full_name,
        email:    clientProfile.email,
        metadata: { supabase_user_id: clientProfile.id },
      });
      customerId = customer.id;

      // Sauvegarder immédiatement pour éviter les doublons
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", client_id);
    }

    // 5. Créer le SetupIntent SEPA Direct Debit
    const setupIntent = await stripe.setupIntents.create({
      customer:             customerId,
      payment_method_types: ["sepa_debit"],
      // Activer l'usage futur pour les paiements automatiques
      usage:                "off_session",
      metadata:             { supabase_user_id: client_id },
    });

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      customer_id:   customerId,
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
