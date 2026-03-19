// app/api/cron/generate-invoices/route.ts
// Route cron — génère automatiquement les factures draft selon la date du jour.
// Appelée par pg_cron le 1er et le 16 de chaque mois.
// Sécurisée par CRON_SECRET (pas de token utilisateur).
//
// RÈGLE DE PÉRIODE :
//   Si on est le 1er  → période couverte = du 16 au dernier jour du mois précédent
//   Si on est le 16   → période couverte = du 1er au 15 du mois en cours
//
// La logique de facturation est identique à /api/invoices/generate.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

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

interface ForfaitLogement {
  id: string;
  name: string;
  client_id: string | null;
  prix_blanchisserie: number | null;
  type_blanchisserie: string | null;
}

// Calcule la période à facturer selon le jour du mois passé en paramètre.
// Retourne null si le jour n'est ni 1 ni 16.
function computePeriod(today: Date): { period_start: string; period_end: string } | null {
  // On lit jour/mois/année depuis les composantes locales UTC pour éviter
  // les décalages de fuseau horaire (le cron tourne en UTC sur le serveur).
  const day   = today.getUTCDate();
  const month = today.getUTCMonth(); // 0-indexé
  const year  = today.getUTCFullYear();

  const pad = (n: number) => String(n).padStart(2, "0");

  if (day === 1) {
    // Période = 16 au dernier jour du mois précédent
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear  = month === 0 ? year - 1 : year;
    // Dernier jour du mois précédent : le jour 0 du mois courant
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      period_start: `${prevYear}-${pad(prevMonth + 1)}-16`,
      period_end:   `${prevYear}-${pad(prevMonth + 1)}-${pad(lastDay)}`,
    };
  }

  if (day === 16) {
    // Période = 1er au 15 du mois en cours
    return {
      period_start: `${year}-${pad(month + 1)}-01`,
      period_end:   `${year}-${pad(month + 1)}-15`,
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier le CRON_SECRET
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Calculer la période automatiquement selon la date du jour
    const today = new Date();
    const period = computePeriod(today);

    if (!period) {
      // Ce jour n'est ni le 1er ni le 16 — rien à faire
      return NextResponse.json({
        success: true,
        message: `Aucune génération prévue le ${today.getUTCDate()} du mois`,
        created: 0,
        skipped: 0,
        invoices: [],
      });
    }

    const { period_start, period_end } = period;

    // 3. Client Supabase serveur (service_role)
    const supabase = createServerClient();

    // 4. Récupérer toutes les interventions terminées de la période
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

    // 6. Récupérer tous les logements en forfait blanchisserie
    const { data: rawForfait, error: forfaitErr } = await supabase
      .from("logements")
      .select("id, name, client_id, prix_blanchisserie, type_blanchisserie")
      .eq("type_blanchisserie", "forfait");

    if (forfaitErr) throw new Error(forfaitErr.message);

    const forfaitLogements = (rawForfait ?? []) as ForfaitLogement[];

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
        period_start,
        period_end,
        created: 0,
        skipped: 0,
        invoices: [],
      });
    }

    // 7. Calculer le prochain numéro séquentiel (FAC-YYYY-NNN)
    const year = parseInt(period_start.slice(0, 4), 10);
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
    // Le forfait blanchisserie est facturé UNIQUEMENT sur la première période (day = 1).
    // On lit le jour directement depuis la chaîne ISO pour éviter tout problème de fuseau.
    const isFirstPeriod = parseInt(period_start.slice(8, 10), 10) === 1;

    const created: InvoiceRow[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const clientId of allClientIds) {
      const clientInterventions = byClient.get(clientId) ?? [];
      const clientForfaits = forfaitByClient.get(clientId) ?? [];

      // Anti-doublon : une seule facture par (client, period_start, period_end)
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

      // Calculer les totaux
      let totalMenage = 0;
      let totalBlanchisserie = 0;

      for (const i of clientInterventions) {
        totalMenage += i.prix_client_ttc ?? 0;
        if (
          i.blanchisserie_incluse &&
          i.logement?.type_blanchisserie === "intervention"
        ) {
          totalBlanchisserie += i.prix_blanchisserie ?? 0;
        }
      }

      if (isFirstPeriod) {
        for (const l of clientForfaits) {
          totalBlanchisserie += l.prix_blanchisserie ?? 0;
        }
      }

      const totalTtc = totalMenage + totalBlanchisserie;

      // Échéance : 30 jours après la fin de la période
      const dueDate = new Date(period_end);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      // Créer la facture
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

      // Créer les lignes de facture
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

      // Lignes blanchisserie forfait : uniquement sur la 1re période (day = 1)
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
        }
      }

      created.push(invoice);
    }

    return NextResponse.json({
      success: true,
      period_start,
      period_end,
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
