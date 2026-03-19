// app/api/invoices/[id]/send/route.ts
//
// POST /api/invoices/:id/send
// Authentification : Bearer token Supabase + rôle admin requis.
//
// Enchaîne en une seule action :
//   1. Vérifie que la facture est au statut "draft"
//   2. Génère le PDF si pdf_url est absent (appel interne au générateur)
//   3. Envoie un email au client avec le lien PDF via Resend
//   4. Met à jour la facture : status → "sent", sent_at → maintenant,
//      due_date → period_end + 5 jours

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/server";
import { buildEmailHtml, computeDueDate } from "@/lib/invoices/email";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

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

    // 3. Récupérer la facture avec le client
    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select(`
        *,
        client:profiles!invoices_client_id_fkey(id, full_name, email)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceErr || !invoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // 4. Vérifier que la facture est en brouillon
    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: `Impossible d'envoyer : la facture est déjà au statut "${invoice.status}"` },
        { status: 422 }
      );
    }

    const typedInvoice = invoice as InvoiceRow & {
      client: { id: string; full_name: string; email: string } | null;
    };

    if (!typedInvoice.client?.email) {
      return NextResponse.json(
        { error: "Le client n'a pas d'adresse email" },
        { status: 422 }
      );
    }

    // 5. Générer le PDF si absent
    let pdfUrl = typedInvoice.pdf_url;
    if (!pdfUrl) {
      const pdfResponse = await fetch(
        `${request.nextUrl.origin}/api/invoices/${invoiceId}/pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!pdfResponse.ok) {
        const pdfErr = await pdfResponse.json() as { error?: string };
        throw new Error(`Échec génération PDF : ${pdfErr.error ?? pdfResponse.status}`);
      }
      const pdfData = await pdfResponse.json() as { pdf_url?: string };
      pdfUrl = pdfData.pdf_url ?? null;
    }

    if (!pdfUrl) {
      throw new Error("URL du PDF manquante après génération");
    }

    // 6. Calcul de la nouvelle due_date = period_end + 5 jours
    const newDueDate = computeDueDate(typedInvoice.period_end);

    // 7. Envoi de l'email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      throw new Error("RESEND_API_KEY manquante — configurer la variable d'environnement");
    }

    const companyName  = process.env.COMPANY_NAME  ?? "Deltom";
    const companyEmail = process.env.COMPANY_EMAIL ?? "";
    const companyPhone = process.env.COMPANY_PHONE ?? "";

    const fromEmail = process.env.RESEND_FROM_EMAIL
      ? `${companyName} <${process.env.RESEND_FROM_EMAIL}>`
      : `${companyName} <onboarding@resend.dev>`;

    const resend = new Resend(resendKey);

    const emailHtml = buildEmailHtml({
      clientName:    typedInvoice.client.full_name,
      invoiceNumber: typedInvoice.invoice_number,
      periodStart:   typedInvoice.period_start,
      periodEnd:     typedInvoice.period_end,
      totalTtc:      typedInvoice.total_ttc,
      dueDate:       newDueDate,
      pdfUrl,
      companyName,
      companyEmail,
      companyPhone,
    });

    const { error: emailError } = await resend.emails.send({
      from:    fromEmail,
      to:      typedInvoice.client.email,
      subject: `Facture ${typedInvoice.invoice_number} — ${companyName}`,
      html:    emailHtml,
    });

    if (emailError) {
      throw new Error(`Échec envoi email Resend : ${emailError.message}`);
    }

    // 8. Mettre à jour la facture : status → sent, sent_at, due_date
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status:   "sent",
        sent_at:  new Date().toISOString(),
        due_date: newDueDate,
      })
      .eq("id", invoiceId);

    if (updateError) {
      // L'email a été envoyé — on logue l'erreur DB sans bloquer
      Sentry.captureException(
        new Error(`Email envoyé mais erreur maj statut : ${updateError.message}`)
      );
    }

    return NextResponse.json({
      success:  true,
      pdf_url:  pdfUrl,
      due_date: newDueDate,
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
