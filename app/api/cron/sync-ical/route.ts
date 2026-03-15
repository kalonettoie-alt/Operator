// app/api/cron/sync-ical/route.ts
// Cron job — synchronise toutes les sources iCal actives.
// Appelé automatiquement par Vercel Cron (ou un service externe).
// Sécurisé par CRON_SECRET dans l'header Authorization.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { syncIcalSources } from "@/lib/utils/syncIcal";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier le CRON_SECRET
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Client Supabase avec service_role (bypass RLS)
    const supabase = createServerClient();

    // 3. Synchroniser toutes les sources actives
    const result = await syncIcalSources(supabase);

    return NextResponse.json({
      success: true,
      sources:                     result.sources.length,
      totalCreated:                result.totalCreated,
      totalUpdated:                result.totalUpdated,
      totalCancelled:              result.totalCancelled,
      totalInterventionsCreated:   result.totalInterventionsCreated,
      totalInterventionsCancelled: result.totalInterventionsCancelled,
      errors: result.sources.flatMap((s) =>
        s.errors.map((e) => `[${s.platform}/${s.sourceId.slice(0, 8)}] ${e}`)
      ),
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
