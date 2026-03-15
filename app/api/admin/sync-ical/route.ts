// app/api/admin/sync-ical/route.ts
// API Route admin — déclenche la sync iCal manuellement depuis l'interface.
// Sécurisée par token Supabase Bearer + vérification du rôle admin.
// Body optionnel : { source_id: string } — si absent, synchronise toutes les sources actives.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { syncIcalSources } from "@/lib/utils/syncIcal";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
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
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 3. Lire le source_id optionnel dans le body
    let sourceId: string | undefined;
    try {
      const body = await request.json() as { source_id?: string };
      sourceId = body?.source_id?.trim() || undefined;
    } catch {
      // body vide ou absent — sync globale
    }

    // 4. Synchroniser
    const result = await syncIcalSources(supabase, sourceId);

    return NextResponse.json({
      success: true,
      sources:                     result.sources.length,
      totalCreated:                result.totalCreated,
      totalUpdated:                result.totalUpdated,
      totalCancelled:              result.totalCancelled,
      totalInterventionsCreated:   result.totalInterventionsCreated,
      totalInterventionsCancelled: result.totalInterventionsCancelled,
      details: result.sources,
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
