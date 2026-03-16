// app/api/invoices/[id]/pdf/route.ts
// Génère le PDF d'une facture, l'uploade dans Supabase Storage (bucket "factures"),
// met à jour invoice.pdf_url et retourne l'URL publique.
//
// POST /api/invoices/:id/pdf
// Authentification : Bearer token Supabase + rôle admin requis.

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";
import { createServerClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database";

type InvoiceRow  = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"];

interface InvoiceWithDetails extends InvoiceRow {
  client: { id: string; full_name: string; email: string; address?: string | null } | null;
  lines:  InvoiceLine[];
}

// ─── Helpers formatage ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateStr));
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  // ex : "Février 2025"
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d);
  return month.charAt(0).toUpperCase() + month.slice(1) + " " + d.getFullYear();
}

function formatPrix(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value).replace(/[\u00a0\u202f]/g, " ");
}

// Extrait le nom du logement depuis la description (format "Ménage — LogementName — date")
function extractLogementName(description: string): string {
  const parts = description.split(" — ");
  if (parts.length >= 2) return parts[1].trim();
  return description;
}

// Extrait la date courte (dd/mm) depuis la description
function extractShortDate(description: string): string {
  const parts = description.split(" — ");
  if (parts.length >= 3) {
    // format dd/mm/yyyy → dd/mm
    const datePart = parts[2].trim();
    const [day, month] = datePart.split("/");
    if (day && month) return `${day}/${month}`;
    return datePart;
  }
  return "";
}

// ─── Groupement des lignes par logement ──────────────────────────────────────

interface LogementGroup {
  logementId: string;
  logementName: string;
  menageDates: string[];      // dates courtes pour les interventions ménage
  menageUnitPrice: number;    // prix unitaire HT (sans TVA)
  menageCount: number;        // nombre d'interventions
  blanchisserie: {
    description: string;
    unitPrice: number;        // prix HT
    quantity: number;
  } | null;
}

function groupLinesByLogement(lines: InvoiceLine[]): LogementGroup[] {
  const TVA = 0.20;
  const groups = new Map<string, LogementGroup>();

  for (const line of lines) {
    const logId = line.logement_id;
    const logName = extractLogementName(line.description);

    if (!groups.has(logId)) {
      groups.set(logId, {
        logementId: logId,
        logementName: logName,
        menageDates: [],
        menageUnitPrice: 0,
        menageCount: 0,
        blanchisserie: null,
      });
    }

    const g = groups.get(logId)!;

    if (line.type === "menage") {
      // unit_price stocké est TTC → on calcule HT
      const priceHT = line.unit_price / (1 + TVA);
      g.menageCount += (line.quantity ?? 1);
      g.menageUnitPrice = priceHT; // même prix pour toutes les interventions d'un logement
      const shortDate = extractShortDate(line.description);
      if (shortDate) g.menageDates.push(shortDate);
    } else {
      // blanchisserie_intervention ou blanchisserie_forfait
      const priceHT = line.unit_price / (1 + TVA);
      if (!g.blanchisserie) {
        g.blanchisserie = {
          description: `Blanchisserie pour : ${logName}`,
          unitPrice: priceHT,
          quantity: line.quantity ?? 1,
        };
      } else {
        g.blanchisserie.quantity += (line.quantity ?? 1);
      }
    }
  }

  return Array.from(groups.values());
}

// ─── Génération PDF ───────────────────────────────────────────────────────────

async function buildPdf(invoice: InvoiceWithDetails): Promise<Uint8Array> {
  const TVA_RATE = 0.20;

  const doc  = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Palette
  const black     = rgb(0.09, 0.09, 0.09);
  const muted     = rgb(0.40, 0.40, 0.40);
  const white     = rgb(1, 1, 1);
  const borderClr = rgb(0.80, 0.80, 0.80);
  const stripeClr = rgb(0.96, 0.96, 0.96);
  // Doré/olive foncé pour l'en-tête tableau (#8B7D3C)
  const headerClr = rgb(0.545, 0.490, 0.235);
  // Texte total TTC rouge/doré (#C0392B → adapté en brun-rouge)
  const totalClr  = rgb(0.75, 0.22, 0.17);
  const darkTeal  = rgb(0.118, 0.239, 0.239); // #1e3d3d

  const mx = 45; // marge horizontale

  // Helper texte (repère Y depuis le haut)
  function txt(
    str: string,
    xPos: number,
    yFromTop: number,
    opts: {
      font?:       typeof fontBold;
      size?:       number;
      color?:      typeof black;
      alignRight?: boolean;
      maxWidth?:   number;
    } = {}
  ) {
    const f      = opts.font  ?? fontRegular;
    const s      = opts.size  ?? 9;
    const c      = opts.color ?? black;
    const yPdf   = height - yFromTop;
    let finalX   = xPos;
    if (opts.alignRight && opts.maxWidth !== undefined) {
      finalX = xPos + opts.maxWidth - f.widthOfTextAtSize(str, s);
    }
    page.drawText(str, { x: finalX, y: yPdf, font: f, size: s, color: c });
  }

  function hLine(yFromTop: number, x1 = mx, x2 = width - mx, color = borderClr, thickness = 0.5) {
    page.drawLine({
      start: { x: x1, y: height - yFromTop },
      end:   { x: x2, y: height - yFromTop },
      thickness, color,
    });
  }

  function fillRect(xPos: number, yFromTop: number, w: number, h: number, color: typeof black) {
    page.drawRectangle({ x: xPos, y: height - yFromTop - h, width: w, height: h, color });
  }

  // ── Variables société ──────────────────────────────────────────────────────
  const companyName    = process.env.COMPANY_NAME    ?? "Deltom";
  const companyAddress = process.env.COMPANY_ADDRESS ?? "";
  const companySiret   = process.env.COMPANY_SIRET   ?? "";
  const companyApe     = process.env.COMPANY_APE     ?? "8299Z";
  const companyPhone   = process.env.COMPANY_PHONE   ?? "";
  const companyEmail   = process.env.COMPANY_EMAIL   ?? "";

  // ── Logo centré en haut ────────────────────────────────────────────────────
  let y = 20;
  try {
    const logoPath = join(process.cwd(), "public", "logo-deltom.png");
    const logoData = readFileSync(logoPath);
    const logoImg  = await doc.embedPng(logoData);
    const logoW    = 70;
    const logoH    = 70;
    const logoX    = (width - logoW) / 2;
    page.drawImage(logoImg, { x: logoX, y: height - y - logoH, width: logoW, height: logoH });
    y += logoH + 10;
  } catch {
    // Si le logo est absent, on affiche le nom en texte
    txt(companyName, (width / 2) - 30, y + 20, { font: fontBold, size: 20, color: darkTeal });
    y += 40;
  }

  // ── En-tête : société gauche | client droit ────────────────────────────────
  const leftX  = mx;
  const rightX = width / 2 + 20;
  const infoY  = y;

  // Colonne gauche : infos société
  let leftY = infoY;
  txt(companyName,              leftX, leftY, { font: fontBold, size: 10, color: darkTeal });
  leftY += 14;
  if (companyAddress) {
    // Découpage adresse sur 2 lignes si virgule
    const addrParts = companyAddress.split(",");
    for (const part of addrParts) {
      txt(part.trim(), leftX, leftY, { size: 8, color: muted });
      leftY += 11;
    }
  }
  if (companySiret) {
    txt(`SIRET : ${companySiret}`, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }
  if (companyApe) {
    txt(`Code APE : ${companyApe}`, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }
  if (companyPhone) {
    txt(`Tel : ${companyPhone}`, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }
  if (companyEmail) {
    txt(companyEmail, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }

  // Colonne droite : infos client
  let rightY = infoY;
  txt("Client :", rightX, rightY, { size: 8, color: muted });
  rightY += 13;
  txt(invoice.client?.full_name ?? "Client inconnu", rightX, rightY, { font: fontBold, size: 10 });
  rightY += 13;
  if (invoice.client?.email) {
    txt(invoice.client.email, rightX, rightY, { size: 8, color: muted });
    rightY += 11;
  }
  if (invoice.client?.address) {
    txt(invoice.client.address, rightX, rightY, { size: 8, color: muted });
    rightY += 11;
  }

  // ── Séparateur ────────────────────────────────────────────────────────────
  y = Math.max(leftY, rightY) + 12;
  hLine(y, mx, width - mx, headerClr, 1.5);
  y += 16;

  // ── Bloc facture ──────────────────────────────────────────────────────────
  // Partie gauche : N° facture, mois, description, date
  const blockRightX = width - mx - 200;

  txt(`Facture N° ${invoice.invoice_number}`, mx, y, { font: fontBold, size: 12, color: darkTeal });
  y += 16;

  const periodLabel = formatMonthYear(invoice.period_start);
  txt(periodLabel, mx, y, { size: 10, color: muted });
  y += 13;

  txt("Description du projet : Nettoyage, Blanchisserie", mx, y, { size: 9, color: muted });
  y += 13;

  txt(`Date d'emission : ${formatDate(invoice.created_at ?? new Date().toISOString())}`, mx, y, { size: 9, color: muted });

  // Partie droite : Règlement
  txt("Reglement : A reception", blockRightX, y - 4, {
    font: fontBold, size: 9, color: darkTeal,
    alignRight: true, maxWidth: 200,
  });
  y += 22;

  // ── En-tête tableau ───────────────────────────────────────────────────────
  const tableW   = width - 2 * mx;
  const headerH  = 20;

  // Colonnes : Désignation | Qté | Prix unit. HT | Montant HT | TVA | Montant TTC
  // Positions de départ des colonnes (x absolu)
  const colDesX    = mx;
  const colDesW    = 175;
  const colQtyX    = colDesX + colDesW;
  const colQtyW    = 35;
  const colUnitX   = colQtyX + colQtyW;
  const colUnitW   = 70;
  const colHtX     = colUnitX + colUnitW;
  const colHtW     = 65;
  const colTvaX    = colHtX + colHtW;
  const colTvaW    = 45;
  const colTtcX    = colTvaX + colTvaW;
  // colTtcW = reste jusqu'à width - mx
  const colTtcW    = (width - mx) - colTtcX;

  fillRect(mx, y, tableW, headerH, headerClr);
  const hy = y + 14;
  txt("Designation",      colDesX  + 4, hy, { font: fontBold, size: 8, color: white });
  txt("Qte",              colQtyX,      hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colQtyW - 4 });
  txt("Prix unit. HT",    colUnitX,     hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colUnitW - 4 });
  txt("Montant HT",       colHtX,       hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colHtW - 4 });
  txt("TVA",              colTvaX,      hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colTvaW - 4 });
  txt("Montant TTC",      colTtcX,      hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colTtcW - 4 });
  y += headerH;

  // ── Lignes groupées par logement ──────────────────────────────────────────
  const groups = groupLinesByLogement(invoice.lines);
  let rowIdx   = 0;

  for (const g of groups) {
    // Titre de section : nom du logement en gras
    const sectionH = 16;
    fillRect(mx, y, tableW, sectionH, rgb(0.93, 0.91, 0.85)); // fond beige clair
    const sy = y + 11;
    txt(g.logementName, colDesX + 4, sy, { font: fontBold, size: 9, color: darkTeal });
    y += sectionH;

    // Ligne interventions (ménage) : toutes les dates sur une ligne
    if (g.menageCount > 0) {
      const rowH = 15;
      if (rowIdx % 2 === 0) fillRect(mx, y, tableW, rowH, stripeClr);

      const datesStr  = `Intervention : ${g.menageDates.join(" - ")}`;
      const priceHT   = g.menageUnitPrice;
      const montantHT = priceHT * g.menageCount;
      const tvaAmt    = montantHT * TVA_RATE;
      const montantTTC = montantHT + tvaAmt;

      // Tronquer si trop long
      let desc = datesStr;
      const maxDescPx = colDesW - 8;
      while (desc.length > 6 && fontRegular.widthOfTextAtSize(desc, 8) > maxDescPx) {
        desc = desc.slice(0, -1);
      }
      if (desc.length < datesStr.length) desc = desc.slice(0, -3) + "...";

      const ly = y + 10;
      txt(desc,                        colDesX  + 4,  ly, { size: 8 });
      txt(String(g.menageCount),       colQtyX,       ly, { size: 8, alignRight: true, maxWidth: colQtyW - 4 });
      txt(formatPrix(priceHT),         colUnitX,      ly, { size: 8, alignRight: true, maxWidth: colUnitW - 4 });
      txt(formatPrix(montantHT),       colHtX,        ly, { size: 8, alignRight: true, maxWidth: colHtW - 4 });
      txt("20%",                        colTvaX,       ly, { size: 8, alignRight: true, maxWidth: colTvaW - 4 });
      txt(formatPrix(montantTTC),      colTtcX,       ly, { size: 8, alignRight: true, maxWidth: colTtcW - 4 });
      y += rowH;
      rowIdx++;
    }

    // Ligne blanchisserie si présente
    if (g.blanchisserie) {
      const rowH = 15;
      if (rowIdx % 2 === 0) fillRect(mx, y, tableW, rowH, stripeClr);

      const priceHT    = g.blanchisserie.unitPrice;
      const qty        = g.blanchisserie.quantity;
      const montantHT  = priceHT * qty;
      const tvaAmt     = montantHT * TVA_RATE;
      const montantTTC = montantHT + tvaAmt;

      const ly = y + 10;
      txt(g.blanchisserie.description, colDesX  + 4,  ly, { size: 8 });
      txt(String(qty),                  colQtyX,       ly, { size: 8, alignRight: true, maxWidth: colQtyW - 4 });
      txt(formatPrix(priceHT),          colUnitX,      ly, { size: 8, alignRight: true, maxWidth: colUnitW - 4 });
      txt(formatPrix(montantHT),        colHtX,        ly, { size: 8, alignRight: true, maxWidth: colHtW - 4 });
      txt("20%",                         colTvaX,       ly, { size: 8, alignRight: true, maxWidth: colTvaW - 4 });
      txt(formatPrix(montantTTC),       colTtcX,       ly, { size: 8, alignRight: true, maxWidth: colTtcW - 4 });
      y += rowH;
      rowIdx++;
    }

    // Saut de page de sécurité
    if (y > height - 180) break;
  }

  // Ligne fin tableau
  y += 6;
  hLine(y, mx, width - mx, borderClr, 0.5);
  y += 18;

  // ── Totaux ────────────────────────────────────────────────────────────────
  // Recalcul propre depuis les lignes (TVA 20%)
  const totalHT  = invoice.total_ttc / (1 + TVA_RATE);
  const totalTVA = invoice.total_ttc - totalHT;
  const totalTTC = invoice.total_ttc;

  const totBlockX = width - mx - 200;
  const totBlockW = 200;

  // Total HT
  txt("Total HT",         totBlockX + 4, y, { size: 9, color: muted });
  txt(formatPrix(totalHT), totBlockX, y,   { size: 9, alignRight: true, maxWidth: totBlockW - 4 });
  y += 14;

  // TVA 20%
  txt("TVA 20%",           totBlockX + 4, y, { size: 9, color: muted });
  txt(formatPrix(totalTVA), totBlockX, y,  { size: 9, alignRight: true, maxWidth: totBlockW - 4 });
  y += 14;

  hLine(y, totBlockX, width - mx, borderClr, 0.5);
  y += 6;

  // Total TTC en gras + fond doré léger
  const ttcH = 22;
  fillRect(totBlockX, y, totBlockW, ttcH, rgb(0.97, 0.95, 0.88));
  const ttcY = y + 15;
  txt("Total TTC",           totBlockX + 6, ttcY, { font: fontBold, size: 10, color: totalClr });
  txt(formatPrix(totalTTC),  totBlockX, ttcY,     { font: fontBold, size: 10, color: totalClr, alignRight: true, maxWidth: totBlockW - 6 });
  y += ttcH + 30;

  // ── Mentions légales ──────────────────────────────────────────────────────
  const footerY = 820;
  hLine(footerY - 14, mx, width - mx, borderClr, 0.5);
  txt(
    `TVA 20% appliquee sur toutes les prestations. En cas de retard de paiement, ` +
    `une penalite egale a 3 fois le taux d'interet legal sera appliquee (art. L441-10 du Code de Commerce).`,
    mx, footerY - 2, { size: 6.5, color: muted }
  );
  txt(
    `Facture emise le ${formatDate(new Date().toISOString())} — ${companyName}`,
    mx, footerY + 10, { size: 6.5, color: muted }
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

    // 5. Upload dans Supabase Storage (upsert = remplacement si déjà existant)
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
