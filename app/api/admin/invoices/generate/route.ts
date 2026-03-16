// app/api/admin/invoices/generate/route.ts
// API Route admin — génère les factures draft pour une période donnée.
// Corps : { period_start: string, period_end: string } (format YYYY-MM-DD)
// Sécurisée par token Supabase Bearer + vérification du rôle admin.
//
// LOGIQUE DE FACTURATION :
// Pour chaque client ayant des interventions terminées OU des logements en forfait blanchisserie :
//   1. Vérifie qu'aucune facture n'existe déjà (client × période) → anti-doublon
//   2. Crée la facture en statut "draft"
//   3. Crée une invoice_line par intervention (type="menage")
//   4. Si logement.type_blanchisserie = 'intervention' ET intervention.blanchisserie_incluse :
//      → une invoice_line de type "blanchisserie_intervention" par intervention concernée
//   5. Si logement.type_blanchisserie = 'forfait' :
//      → UNE invoice_line de type "blanchisserie_forfait" par logement (même sans intervention)
//   6. total_ttc = total_menage + total_blanchisserie

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

// Type des interventions récupérées pour la facturation
interface InterventionForInvoice {
  id: string;
  client_id: string;
  logement_id: string;
  date: string;
  prix_client_ttc: number | null;
  prix_blanchisserie: number | null;
  blanchisserie_incluse: boolean | null;
  logement: {
    id: string;
    name: string;
    type_blanchisserie: string | null;
  } | null;
}

// Type des logements en forfait blanchisserie
interface ForfaitLogement {
  id: string;
  name: string;
  client_id: string | null;
  prix_blanchisserie: number | null;
  type_blanchisserie: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification (même pattern que /api/admin/sync-ical)
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

    // 3. Valider la période
    let body: { period_start?: string; period_end?: string };
    try {
      body = await request.json() as { period_start?: string; period_end?: string };
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { period_start, period_end } = body;

    if (
      !period_start || !period_end ||
      !/^\d{4}-\d{2}-\d{2}$/.test(period_start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(period_end) ||
      period_start > period_end
    ) {
      return NextResponse.json({ error: "Période invalide (format YYYY-MM-DD requis)" }, { status: 400 });
    }

    // 4. Récupérer toutes les interventions terminées de la période
    //    On récupère aussi type_blanchisserie du logement pour savoir comment facturer
    const { data: rawInterventions, error: interErr } = await supabase
      .from("interventions")
      .select(`
        id,
        client_id,
        logement_id,
        date,
        prix_client_ttc,
        prix_blanchisserie,
        blanchisserie_incluse,
        logement:logements!interventions_logement_id_fkey(id, name, type_blanchisserie)
      `)
      .eq("status", "terminee")
      .gte("date", period_start)
      .lte("date", period_end)
      .order("date", { ascending: true });

    if (interErr) throw new Error(interErr.message);

    const interventions = (rawInterventions ?? []) as unknown as InterventionForInvoice[];

    // 5. Grouper les interventions par client
    const byClient = new Map<string, InterventionForInvoice[]>();
    for (const i of interventions) {
      const list = byClient.get(i.client_id) ?? [];
      list.push(i);
      byClient.set(i.client_id, list);
    }

    // 6. Récupérer tous les logements en forfait blanchisserie (toutes périodes confondues)
    //    Ces logements doivent être facturés même s'ils n'ont eu aucune intervention ce mois-ci
    const { data: rawForfait, error: forfaitErr } = await supabase
      .from("logements")
      .select("id, name, client_id, prix_blanchisserie, type_blanchisserie")
      .eq("type_blanchisserie", "forfait");

    if (forfaitErr) throw new Error(forfaitErr.message);

    const forfaitLogements = (rawForfait ?? []) as ForfaitLogement[];

    // Grouper les logements forfait par client
    const forfaitByClient = new Map<string, ForfaitLogement[]>();
    for (const l of forfaitLogements) {
      if (!l.client_id) continue;
      const list = forfaitByClient.get(l.client_id) ?? [];
      list.push(l);
      forfaitByClient.set(l.client_id, list);
    }

    // Union de tous les clients à facturer (interventions + forfait)
    const allClientIds = new Set([...byClient.keys(), ...forfaitByClient.keys()]);

    if (allClientIds.size === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune intervention terminée ni logement forfait sur cette période",
        created: 0,
        skipped: 0,
        invoices: [],
      });
    }

    // 7. Calculer le prochain numéro séquentiel de l'année (FAC-YYYY-NNN)
    const year = new Date(period_start).getFullYear();
    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `FAC-${year}-%`)
      .order("invoice_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSeq = 1;
    if (lastInvoice?.invoice_number) {
      const lastSeq = parseInt(lastInvoice.invoice_number.split("-")[2] ?? "0", 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    // 8. Générer les factures
    // Le forfait blanchisserie est facturé UNIQUEMENT sur la première période du mois (1–15)
    // On lit le jour directement depuis la chaîne ISO (ex: "2026-03-01") pour éviter tout
    // problème de fuseau horaire avec new Date() qui parse en UTC.
    const isFirstPeriod = parseInt(period_start.slice(8, 10), 10) === 1;

    const created: InvoiceRow[] = [];
    const skipped: string[] = [];        // client_ids ignorés (doublon)
    const errors: string[] = [];

    for (const clientId of allClientIds) {
      const clientInterventions = byClient.get(clientId) ?? [];
      const clientForfaits = forfaitByClient.get(clientId) ?? [];

      // 8a. Anti-doublon : une seule facture par (client, period_start, period_end)
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("client_id", clientId)
        .eq("period_start", period_start)
        .eq("period_end", period_end)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped.push(clientId);
        continue;
      }

      // 8b. Calculer les totaux de la facture
      let totalMenage = 0;
      let totalBlanchisserie = 0;

      // Ménage + blanchisserie à l'intervention
      for (const i of clientInterventions) {
        totalMenage += i.prix_client_ttc ?? 0;
        if (
          i.blanchisserie_incluse &&
          i.logement?.type_blanchisserie === "intervention"
        ) {
          totalBlanchisserie += i.prix_blanchisserie ?? 0;
        }
      }

      // Blanchisserie forfait : une ligne par logement, uniquement sur la 1re période (day=1)
      if (isFirstPeriod) {
        for (const l of clientForfaits) {
          totalBlanchisserie += l.prix_blanchisserie ?? 0;
        }
      }

      const totalTtc = totalMenage + totalBlanchisserie;

      // Date d'échéance : 30 jours après la fin de la période
      const dueDate = new Date(period_end);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      // 8c. Créer la facture
      const invoiceNumber = `FAC-${year}-${String(nextSeq).padStart(3, "0")}`;

      const { data: invoice, error: invoiceErr } = await supabase
        .from("invoices")
        .insert({
          client_id:           clientId,
          invoice_number:      invoiceNumber,
          period_start,
          period_end,
          status:              "draft",
          total_menage:        totalMenage,
          total_blanchisserie: totalBlanchisserie,
          total_ttc:           totalTtc,
          due_date:            dueDateStr,
        })
        .select()
        .single();

      if (invoiceErr || !invoice) {
        const msg = `Erreur création facture client ${clientId}: ${invoiceErr?.message}`;
        Sentry.captureException(new Error(msg));
        errors.push(msg);
        continue;
      }

      nextSeq++;

      // 8d. Créer les lignes de facture
      const lines: Database["public"]["Tables"]["invoice_lines"]["Insert"][] = [];

      for (const i of clientInterventions) {
        const logementName = i.logement?.name ?? "Logement";
        const dateStr = new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric",
        }).format(new Date(i.date));

        // Ligne ménage
        lines.push({
          invoice_id:      invoice.id,
          intervention_id: i.id,
          logement_id:     i.logement_id,
          type:            "menage",
          description:     `Ménage — ${logementName} — ${dateStr}`,
          unit_price:      i.prix_client_ttc ?? 0,
          quantity:        1,
          total:           i.prix_client_ttc ?? 0,
        });

        // Ligne blanchisserie à l'intervention
        // Uniquement si le logement est en mode 'intervention' ET blanchisserie_incluse = true
        if (
          i.blanchisserie_incluse &&
          i.logement?.type_blanchisserie === "intervention" &&
          (i.prix_blanchisserie ?? 0) > 0
        ) {
          lines.push({
            invoice_id:      invoice.id,
            intervention_id: i.id,
            logement_id:     i.logement_id,
            type:            "blanchisserie_intervention",
            description:     `Blanchisserie — ${logementName} — ${dateStr}`,
            unit_price:      i.prix_blanchisserie ?? 0,
            quantity:        1,
            total:           i.prix_blanchisserie ?? 0,
          });
        }
      }

      // Lignes blanchisserie forfait : UNE ligne par logement, uniquement sur la 1re période (day=1)
      if (isFirstPeriod) {
        for (const l of clientForfaits) {
          if ((l.prix_blanchisserie ?? 0) > 0) {
            lines.push({
              invoice_id:      invoice.id,
              intervention_id: null,
              logement_id:     l.id,
              type:            "blanchisserie_forfait",
              description:     `Blanchisserie forfait — ${l.name}`,
              unit_price:      l.prix_blanchisserie ?? 0,
              quantity:        1,
              total:           l.prix_blanchisserie ?? 0,
            });
          }
        }
      }

      if (lines.length > 0) {
        const { error: linesErr } = await supabase
          .from("invoice_lines")
          .insert(lines);

        if (linesErr) {
          const msg = `Erreur lignes facture ${invoice.id}: ${linesErr.message}`;
          Sentry.captureException(new Error(msg));
          errors.push(msg);
          // La facture est créée, les lignes ont échoué — continuer quand même
        }
      }

      created.push(invoice);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors,
      invoices: created,
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
