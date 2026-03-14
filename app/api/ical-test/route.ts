// app/api/ical-test/route.ts
// API Route : vérifie qu'une URL iCal est accessible et retourne du VCALENDAR valide.
// Utilisée par l'admin depuis la page /admin/reservations.
// Le fetch est fait côté serveur pour éviter les problèmes CORS.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier que l'appelant est authentifié en tant qu'admin
    //    On relit le cookie de session depuis les headers de la requête.
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

    // 3. Récupérer et valider l'URL dans le body
    const body = await request.json() as { url?: string };
    const url = body?.url?.trim();

    if (!url) {
      return NextResponse.json({ valid: false, error: "URL manquante" }, { status: 400 });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json({ valid: false, error: "L'URL doit commencer par http:// ou https://" });
    }

    // 4. Fetcher l'URL avec un timeout de 10 secondes
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let text: string;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Deltom-Operator/3.0 iCal-Validator",
          Accept: "text/calendar, */*",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({
          valid: false,
          error: `L'URL a répondu avec le statut HTTP ${response.status}`,
        });
      }

      text = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error && fetchErr.name === "AbortError"
        ? "Timeout : l'URL n'a pas répondu en 10 secondes"
        : "Impossible d'accéder à l'URL";
      return NextResponse.json({ valid: false, error: msg });
    }

    // 5. Vérifier que le contenu est bien un calendrier iCal
    const isIcal =
      text.includes("BEGIN:VCALENDAR") && text.includes("END:VCALENDAR");

    if (!isIcal) {
      return NextResponse.json({
        valid: false,
        error: "L'URL ne retourne pas un fichier iCal valide (BEGIN:VCALENDAR introuvable)",
      });
    }

    // 6. Compter les événements pour donner plus d'infos
    const eventCount = (text.match(/BEGIN:VEVENT/g) ?? []).length;

    return NextResponse.json({
      valid: true,
      eventCount,
      message: `URL valide — ${eventCount} événement${eventCount > 1 ? "s" : ""} trouvé${eventCount > 1 ? "s" : ""}`,
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
