// app/api/invoices/[id]/pdf/route.ts
// Génère le PDF d'une facture, l'uploade dans Supabase Storage (bucket "factures"),
// met à jour invoice.pdf_url et retourne l'URL publique.
//
// POST /api/invoices/:id/pdf
// Authentification : Bearer token Supabase + rôle admin requis.

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database";

type InvoiceRow  = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"];

interface InvoiceWithDetails extends InvoiceRow {
  client: { id: string; full_name: string; email: string } | null;
  lines:  InvoiceLine[];
}

// ─── Helpers formatage ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatPrix(value: number): string {
  // Remplace les espaces insécables (U+00A0, U+202F) par des espaces normaux
  // pour rester dans WinAnsiEncoding (compatible Helvetica PDF standard)
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value).replace(/[\u00a0\u202f]/g, " ");
}

// ─── Génération PDF ───────────────────────────────────────────────────────────

async function buildPdf(invoice: InvoiceWithDetails): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 en points (72 dpi)
  const { width, height } = page.getSize();

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Palette
  const black  = rgb(0.09, 0.09, 0.09);
  const muted  = rgb(0.45, 0.45, 0.45);
  const blue   = rgb(0.13, 0.35, 0.85);
  const white  = rgb(1,    1,    1   );
  const border = rgb(0.85, 0.85, 0.85);
  const stripe = rgb(0.97, 0.97, 0.97);

  const mx = 50; // marge horizontale

  // Helper texte (repère Y depuis le haut, converti en bas pour pdf-lib)
  function txt(
    str: string,
    xPos: number,
    yFromTop: number,
    opts: {
      font?:     typeof fontBold;
      size?:     number;
      color?:    typeof black;
      alignRight?: boolean;
      width?:    number;
    } = {}
  ) {
    const f  = opts.font  ?? fontRegular;
    const s  = opts.size  ?? 10;
    const c  = opts.color ?? black;
    const yPdf = height - yFromTop;
    let finalX  = xPos;
    if (opts.alignRight && opts.width !== undefined) {
      finalX = xPos + opts.width - f.widthOfTextAtSize(str, s);
    }
    page.drawText(str, { x: finalX, y: yPdf, font: f, size: s, color: c });
  }

  function hLine(yFromTop: number) {
    page.drawLine({
      start: { x: mx,           y: height - yFromTop },
      end:   { x: width - mx,   y: height - yFromTop },
      thickness: 0.5, color: border,
    });
  }

  function fillRect(
    xPos: number, yFromTop: number,
    w: number, h: number,
    color: typeof blue
  ) {
    page.drawRectangle({ x: xPos, y: height - yFromTop - h, width: w, height: h, color });
  }

  // Infos société depuis les variables d'environnement
  const companyName    = process.env.COMPANY_NAME    ?? "Deltom";
  const companyAddress = process.env.COMPANY_ADDRESS ?? "";
  const companySiret   = process.env.COMPANY_SIRET   ?? "";
  const companyEmail   = process.env.COMPANY_EMAIL   ?? "";

  // ── En-tête gauche (société) ──────────────────────────────────────────────
  let y = 55;
  txt(companyName, mx, y, { font: fontBold, size: 18, color: blue });
  y += 20;
  if (companyAddress) { txt(companyAddress, mx, y, { size: 8, color: muted }); y += 13; }
  if (companySiret)   { txt(`SIRET : ${companySiret}`, mx, y, { size: 8, color: muted }); y += 13; }
  if (companyEmail)   { txt(companyEmail, mx, y, { size: 8, color: muted }); y += 13; }

  // ── En-tête droite (infos facture) ────────────────────────────────────────
  const rightX = width - mx - 180;
  txt("FACTURE", rightX, 55, { font: fontBold, size: 20, color: black });
  txt(invoice.invoice_number, rightX, 80, { font: fontBold, size: 11, color: blue });
  txt(`Date : ${formatDate(invoice.created_at ?? new Date().toISOString())}`, rightX, 96, { size: 9, color: muted });
  if (invoice.due_date) {
    txt(`Echeance : ${formatDate(invoice.due_date)}`, rightX, 109, { size: 9, color: muted });
  }

  // ── Séparateur ────────────────────────────────────────────────────────────
  const sepY = Math.max(y + 10, 130);
  hLine(sepY);

  // ── Bloc client ───────────────────────────────────────────────────────────
  y = sepY + 18;
  txt("FACTURE A :", mx, y, { font: fontBold, size: 8, color: muted });
  y += 14;
  txt(invoice.client?.full_name ?? "Client inconnu", mx, y, { font: fontBold, size: 11 });
  y += 14;
  if (invoice.client?.email) {
    txt(invoice.client.email, mx, y, { size: 9, color: muted });
    y += 13;
  }
  y += 8;
  txt(
    `Periode : ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`,
    mx, y, { size: 9, color: muted }
  );
  y += 25;

  // ── En-tête tableau ───────────────────────────────────────────────────────
  const tableW    = width - 2 * mx;
  const colQty    = width - mx - 195;
  const colUnit   = width - mx - 130;
  const colTotal  = width - mx - 55;
  const headerH   = 18;

  fillRect(mx, y, tableW, headerH, blue);
  const hy = y + 13; // centre vertical de la ligne d'en-tête
  txt("Prestation",    mx + 6,   hy, { font: fontBold, size: 9, color: white });
  txt("Qte",          colQty,    hy, { font: fontBold, size: 9, color: white, alignRight: true, width: 30 });
  txt("Prix unit.",   colUnit,   hy, { font: fontBold, size: 9, color: white, alignRight: true, width: 65 });
  txt("Total",        colTotal,  hy, { font: fontBold, size: 9, color: white, alignRight: true, width: 55 });
  y += headerH + 4;

  // ── Lignes de facture ─────────────────────────────────────────────────────
  // Tri : ménage d'abord, puis blanchisserie
  const sortedLines = [...invoice.lines].sort((a, b) => {
    const order: Record<string, number> = { menage: 0, blanchisserie_intervention: 1, blanchisserie_forfait: 2 };
    return (order[a.type] ?? 9) - (order[b.type] ?? 9);
  });

  for (let i = 0; i < sortedLines.length; i++) {
    const l = sortedLines[i];
    const rowH = 16;

    // Fond alterné
    if (i % 2 === 0) fillRect(mx, y, tableW, rowH, stripe);

    // Tronquer la description si trop longue
    const maxDescW = colQty - mx - 12;
    let desc = l.description;
    while (desc.length > 3 && fontRegular.widthOfTextAtSize(desc, 9) > maxDescW) {
      desc = desc.slice(0, -1);
    }
    if (desc.length < l.description.length) desc = desc.slice(0, -3) + "...";

    const ly = y + 11;
    txt(desc,                    mx + 6,   ly, { size: 9 });
    txt(String(l.quantity ?? 1), colQty,   ly, { size: 9, alignRight: true, width: 30 });
    txt(formatPrix(l.unit_price), colUnit,  ly, { size: 9, alignRight: true, width: 65 });
    txt(formatPrix(l.total),      colTotal, ly, { size: 9, alignRight: true, width: 55 });
    y += rowH + 2;

    // Saut de page de sécurité (pas de pagination complète dans cette version)
    if (y > height - 200) break;
  }

  // Ligne de fin de tableau
  y += 4;
  hLine(y);
  y += 18;

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totX = width - mx - 210;
  const totW = 210;

  if (invoice.total_menage) {
    txt("Menage :",        totX, y, { size: 9, color: muted });
    txt(formatPrix(invoice.total_menage), totX, y, { size: 9, alignRight: true, width: totW });
    y += 14;
  }
  if (invoice.total_blanchisserie) {
    txt("Blanchisserie :", totX, y, { size: 9, color: muted });
    txt(formatPrix(invoice.total_blanchisserie), totX, y, { size: 9, alignRight: true, width: totW });
    y += 14;
  }

  // TVA non applicable
  txt("TVA non applicable (art. 293 B CGI)", totX, y, { size: 7, color: muted });
  y += 18;

  // Bandeau Total TTC
  const totalBannerH = 22;
  fillRect(totX, y, totW, totalBannerH, blue);
  const ty = y + 15;
  txt("TOTAL TTC", totX + 8, ty, { font: fontBold, size: 10, color: white });
  txt(formatPrix(invoice.total_ttc), totX, ty, { font: fontBold, size: 10, color: white, alignRight: true, width: totW - 8 });
  y += totalBannerH + 30;

  // ── Mentions légales ──────────────────────────────────────────────────────
  const footerY = 820; // 21 points depuis le bas de la page A4
  hLine(footerY - 12);
  txt(
    "TVA non applicable - article 293 B du Code General des Impots. " +
    "En cas de retard de paiement, une penalite egale a 3 fois le taux " +
    "d'interet legal sera appliquee (art. L441-10 du Code de Commerce).",
    mx, footerY, { size: 7, color: muted }
  );
  txt(
    `Facture emise le ${formatDate(new Date().toISOString())} - ${companyName}`,
    mx, footerY + 11, { size: 7, color: muted }
  );

  return doc.save();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    // 1. Authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
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
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // 3. Récupérer la facture avec ses lignes et son client
    const { data: rawInvoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select(`
        *,
        client:profiles!invoices_client_id_fkey(id, full_name, email),
        lines:invoice_lines(*)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceErr || !rawInvoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const invoice = rawInvoice as InvoiceWithDetails;

    // 4. Générer le PDF
    const pdfBytes = await buildPdf(invoice);

    // 5. Upload dans Supabase Storage (bucket "factures", upsert = remplacement si déjà existant)
    const fileName = `${invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("factures")
      .upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      throw new Error(`Erreur upload PDF : ${uploadError.message}`);
    }

    // 6. URL publique du PDF
    const { data: { publicUrl } } = supabase.storage
      .from("factures")
      .getPublicUrl(fileName);

    // 7. Sauvegarder l'URL sur la facture
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ pdf_url: publicUrl })
      .eq("id", invoiceId);

    if (updateError) {
      throw new Error(`Erreur mise à jour pdf_url : ${updateError.message}`);
    }

    return NextResponse.json({ success: true, pdf_url: publicUrl });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
