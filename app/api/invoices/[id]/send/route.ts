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
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(value);
}

// Calcule la due_date = period_end + 5 jours calendaires
function computeDueDate(periodEnd: string): string {
  const d = new Date(periodEnd);
  d.setDate(d.getDate() + 5);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// ─── Template HTML de l'email ────────────────────────────────────────────────

function buildEmailHtml(params: {
  clientName:    string;
  invoiceNumber: string;
  periodStart:   string;
  periodEnd:     string;
  totalTtc:      number;
  dueDate:       string;
  pdfUrl:        string;
  companyName:   string;
  companyEmail:  string;
  companyPhone:  string;
}): string {
  const {
    clientName, invoiceNumber, periodStart, periodEnd,
    totalTtc, dueDate, pdfUrl, companyName, companyEmail, companyPhone,
  } = params;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- En-tête doré -->
          <tr>
            <td style="background:#8B7D3C;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                ${companyName.toUpperCase()}
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">
                Facture N° ${invoiceNumber}
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 20px;font-size:15px;color:#444;">
                Bonjour <strong>${clientName}</strong>,
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                Veuillez trouver ci-joint votre facture pour la période du
                <strong>${formatDate(periodStart)}</strong> au <strong>${formatDate(periodEnd)}</strong>,
                correspondant aux prestations de nettoyage et blanchisserie réalisées dans vos logements.
              </p>

              <!-- Récapitulatif -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#faf8f2;border:1px solid #e8e0c8;border-radius:6px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8e0c8;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#888;">N° de facture</td>
                        <td style="font-size:13px;font-weight:600;text-align:right;">${invoiceNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8e0c8;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#888;">Période</td>
                        <td style="font-size:13px;font-weight:600;text-align:right;">
                          ${formatDate(periodStart)} → ${formatDate(periodEnd)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8e0c8;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#888;">Date d'échéance</td>
                        <td style="font-size:13px;font-weight:600;text-align:right;">${formatDate(dueDate)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:15px;font-weight:700;color:#1a1a1a;">Total TTC</td>
                        <td style="font-size:18px;font-weight:700;color:#8B7D3C;text-align:right;">
                          ${formatPrix(totalTtc)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bouton téléchargement -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${pdfUrl}"
                      style="display:inline-block;background:#8B7D3C;color:#ffffff;text-decoration:none;
                             padding:14px 36px;border-radius:6px;font-size:14px;font-weight:700;
                             letter-spacing:0.5px;">
                      Télécharger la facture PDF
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">
                Ou copiez ce lien dans votre navigateur :
              </p>
              <p style="margin:0 0 28px;font-size:11px;color:#aaa;text-align:center;word-break:break-all;">
                ${pdfUrl}
              </p>

              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                Pour toute question concernant cette facture, n'hésitez pas à nous contacter :
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#555;">
                ${companyEmail ? `<a href="mailto:${companyEmail}" style="color:#8B7D3C;">${companyEmail}</a>` : ""}
                ${companyPhone ? ` · ${companyPhone}` : ""}
              </p>

            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background:#f0ece0;padding:16px 40px;text-align:center;border-top:1px solid #e8e0c8;">
              <p style="margin:0;font-size:11px;color:#aaa;">
                ${companyName} · Règlement à réception · TVA 20%
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

    // Expéditeur : domaine vérifié dans Resend ou sandbox par défaut
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
