// app/api/stripe/test/route.ts
//
// GET /api/stripe/test
// Route de vérification de la connexion Stripe (admin uniquement).
//
// Retourne :
//   200 { connected: true, mode: "test"|"live", account: "acct_xxx" }
//   500 { error: "..." }  si la clé est invalide ou manquante
//
// Utilisation :
//   curl -H "Authorization: Bearer <token>" /api/stripe/test

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentification Bearer (token Supabase)
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé — rôle admin requis" }, { status: 403 });
    }

    // 3. Vérifier la connexion Stripe en récupérant le compte
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve();

    // Détecter le mode (test vs live) depuis la clé
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "live";

    return NextResponse.json({
      connected:    true,
      mode,
      account_id:   account.id,
      country:      account.country,
      currency:     account.default_currency,
      // Vérifier que SEPA Direct Debit est disponible
      sepa_enabled: account.capabilities?.sepa_debit_payments === "active",
    });

  } catch (error) {
    Sentry.captureException(error);

    // Message d'erreur Stripe lisible
    const message = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    );
  }
}
