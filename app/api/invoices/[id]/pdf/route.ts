// app/api/invoices/[id]/pdf/route.ts
// Génère le PDF d'une facture, l'uploade dans Supabase Storage (bucket "factures"),
// met à jour invoice.pdf_url et retourne l'URL publique.
//
// POST /api/invoices/:id/pdf
// Authentification : Bearer token Supabase + rôle admin requis.

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServerClient } from "@/lib/supabase/server";
import { LOGO_DELTOM_BASE64 } from "@/lib/assets/logo-deltom-base64";
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
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d);
  return month.charAt(0).toUpperCase() + month.slice(1) + " " + d.getFullYear();
}

// Formatage EUR sans caractères unicode spéciaux (pdf-lib n'encode qu'en latin-1)
function formatPrix(value: number): string {
  const abs = Math.abs(value);
  const str = abs.toFixed(2).replace(".", ",");
  // groupes de milliers
  const parts = str.split(",");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = value < 0 ? "-" : "";
  return `${sign}${parts.join(",")} EUR`;
}

// Extrait le nom du logement depuis la description
// Format attendu : "Menage — LogementName — dd/mm/yyyy" ou "Blanchisserie — LogementName — ..."
function extractLogementName(description: string): string {
  const parts = description.split(" \u2014 "); // em dash
  if (parts.length >= 2) return parts[1].trim();
  // Fallback : séparateur tiret court
  const parts2 = description.split(" - ");
  if (parts2.length >= 2) return parts2[1].trim();
  return description;
}

// Extrait la date courte (dd/mm) depuis la description
function extractShortDate(description: string): string {
  // Cherche un pattern dd/mm ou dd/mm/yyyy en fin de description
  const match = description.match(/(\d{2}\/\d{2})(?:\/\d{4})?(?:\s|$)/);
  if (match) return match[1];
  // Fallback : dernier segment après em-dash
  const parts = description.split(" \u2014 ");
  if (parts.length >= 3) {
    const datePart = parts[2].trim();
    const [day, month] = datePart.split("/");
    if (day && month) return `${day}/${month}`;
  }
  return "";
}

// ─── Groupement des lignes par logement ──────────────────────────────────────

interface LogementGroup {
  logementId:     string;
  logementName:   string;
  menageDates:    string[];
  menageUnitHT:   number;   // prix unitaire HT pour les interventions ménage
  menageCount:    number;
  blanchisserie: {
    label:     string;
    unitHT:    number;
    quantity:  number;
  } | null;
}

// Les unit_price dans invoice_lines sont stockés en TTC (= prix_client_ttc)
function groupLinesByLogement(lines: InvoiceLine[]): LogementGroup[] {
  const TVA = 0.20;
  const groups = new Map<string, LogementGroup>();

  for (const line of lines) {
    const logId   = line.logement_id;
    const logName = extractLogementName(line.description);

    if (!groups.has(logId)) {
      groups.set(logId, {
        logementId:   logId,
        logementName: logName,
        menageDates:  [],
        menageUnitHT: 0,
        menageCount:  0,
        blanchisserie: null,
      });
    }

    const g = groups.get(logId)!;

    if (line.type === "menage") {
      const unitHT = line.unit_price / (1 + TVA);
      g.menageCount  += (line.quantity ?? 1);
      g.menageUnitHT  = unitHT; // même prix unitaire pour toutes les interventions d'un logement
      const shortDate = extractShortDate(line.description);
      if (shortDate) g.menageDates.push(shortDate);
    } else {
      // blanchisserie_intervention ou blanchisserie_forfait
      const unitHT = line.unit_price / (1 + TVA);
      if (!g.blanchisserie) {
        g.blanchisserie = {
          label:    `Blanchisserie pour : ${logName}`,
          unitHT,
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

  // ── Palette ────────────────────────────────────────────────────────────────
  const black     = rgb(0.09, 0.09, 0.09);
  const muted     = rgb(0.40, 0.40, 0.40);
  const white     = rgb(1, 1, 1);
  const borderClr = rgb(0.80, 0.80, 0.80);
  const stripeClr = rgb(0.96, 0.95, 0.93);

  // Doré/olive foncé #8B7D3C
  const golden    = rgb(0.545, 0.490, 0.235);
  // Fond beige très léger pour les totaux
  const beigeClr  = rgb(0.97, 0.95, 0.88);
  // Fond section logement
  const sectionBg = rgb(0.93, 0.91, 0.85);
  // Teal sombre #1e3d3d pour le logo texte fallback
  const darkTeal  = rgb(0.118, 0.239, 0.239);

  const mx = 45; // marge horizontale gauche/droite

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Dessine du texte. yFromTop = distance depuis le haut de la page.
  function txt(
    str: string,
    xPos: number,
    yFromTop: number,
    opts: {
      font?:       typeof fontBold;
      size?:       number;
      color?:      typeof black;
      alignRight?: boolean; // aligner à droite dans maxWidth
      maxWidth?:   number;
    } = {}
  ) {
    const f    = opts.font  ?? fontRegular;
    const s    = opts.size  ?? 9;
    const c    = opts.color ?? black;
    const yPdf = height - yFromTop;
    let finalX = xPos;
    if (opts.alignRight && opts.maxWidth !== undefined) {
      finalX = xPos + opts.maxWidth - f.widthOfTextAtSize(str, s);
    }
    page.drawText(str, { x: finalX, y: yPdf, font: f, size: s, color: c });
  }

  function hLine(
    yFromTop: number,
    x1 = mx,
    x2 = width - mx,
    color = borderClr,
    thickness = 0.5
  ) {
    page.drawLine({
      start: { x: x1, y: height - yFromTop },
      end:   { x: x2, y: height - yFromTop },
      thickness,
      color,
    });
  }

  function fillRect(
    xPos: number,
    yFromTop: number,
    w: number,
    h: number,
    color: ReturnType<typeof rgb>
  ) {
    page.drawRectangle({
      x: xPos, y: height - yFromTop - h,
      width: w, height: h,
      color,
    });
  }

  // ── Variables société ──────────────────────────────────────────────────────
  const companyName    = process.env.COMPANY_NAME    ?? "Deltom";
  const companyAddress = process.env.COMPANY_ADDRESS ?? "";
  const companySiret   = process.env.COMPANY_SIRET   ?? "";
  const companyApe     = process.env.COMPANY_APE     ?? "8299Z";
  const companyPhone   = process.env.COMPANY_PHONE   ?? "";
  const companyEmail   = process.env.COMPANY_EMAIL   ?? "";

  // ── Logo centré en haut ────────────────────────────────────────────────────
  let y = 22;

  // Le logo est inliné en base64 dans LOGO_DELTOM_BASE64
  // → garanti disponible même dans les fonctions serverless Vercel
  try {
    const logoBytes = Buffer.from(LOGO_DELTOM_BASE64, "base64");
    const logoImg   = await doc.embedPng(new Uint8Array(logoBytes));
    const logoW     = 72;
    const logoH     = 72;
    const logoX     = (width - logoW) / 2;
    page.drawImage(logoImg, {
      x:      logoX,
      y:      height - y - logoH,
      width:  logoW,
      height: logoH,
    });
    y += logoH + 12;
  } catch (logoError) {
    // Fallback texte si le logo ne peut pas être chargé
    Sentry.captureException(logoError);
    txt(companyName, (width / 2) - 35, y + 22, {
      font: fontBold, size: 22, color: darkTeal,
    });
    y += 50;
  }

  // ── Ligne dorée sous le logo ───────────────────────────────────────────────
  hLine(y, mx, width - mx, golden, 2);
  y += 16;

  // ── En-tête : société gauche | client droit ────────────────────────────────
  const leftX  = mx;
  const rightX = width / 2 + 10;
  const infoStartY = y;

  // Colonne gauche : infos société
  let leftY = infoStartY;
  txt(companyName, leftX, leftY, { font: fontBold, size: 10, color: darkTeal });
  leftY += 14;

  if (companyAddress) {
    // Découpage sur plusieurs lignes si virgule
    for (const part of companyAddress.split(",")) {
      txt(part.trim(), leftX, leftY, { size: 8, color: muted });
      leftY += 11;
    }
  }
  if (companySiret) {
    txt(`SIRET : ${companySiret}`, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }
  txt(`Code APE : ${companyApe}`, leftX, leftY, { size: 8, color: muted });
  leftY += 11;
  if (companyPhone) {
    txt(`Tel : ${companyPhone}`, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }
  if (companyEmail) {
    txt(companyEmail, leftX, leftY, { size: 8, color: muted });
    leftY += 11;
  }

  // Colonne droite : infos client
  let rightY = infoStartY;
  const clientName = invoice.client?.full_name ?? "Client inconnu";
  txt("Facture a l'attention de :", rightX, rightY, { size: 8, color: muted });
  rightY += 13;
  txt(clientName, rightX, rightY, { font: fontBold, size: 10, color: black });
  rightY += 13;
  if (invoice.client?.email) {
    txt(invoice.client.email, rightX, rightY, { size: 8, color: muted });
    rightY += 11;
  }
  if (invoice.client?.address) {
    txt(invoice.client.address, rightX, rightY, { size: 8, color: muted });
    rightY += 11;
  }

  // ── Séparateur doré ────────────────────────────────────────────────────────
  y = Math.max(leftY, rightY) + 14;
  hLine(y, mx, width - mx, golden, 1.5);
  y += 18;

  // ── Bloc informations facture ──────────────────────────────────────────────
  // Gauche : N° facture, mois, description, date
  // Droite : Règlement

  txt(`Facture N  ${invoice.invoice_number}`, mx, y, {
    font: fontBold, size: 13, color: darkTeal,
  });
  y += 18;

  const periodLabel = formatMonthYear(invoice.period_start);
  txt(periodLabel, mx, y, { font: fontBold, size: 10, color: golden });
  y += 14;

  txt("Description du projet : Nettoyage, Blanchisserie", mx, y, { size: 9, color: muted });
  y += 12;

  const emissionDate = formatDate(invoice.created_at ?? new Date().toISOString());
  txt(`Date d emission : ${emissionDate}`, mx, y, { size: 9, color: muted });

  // Règlement aligné à droite
  txt("Reglement : A reception", width - mx, y - 1, {
    font: fontBold, size: 9, color: golden,
    alignRight: true, maxWidth: width - mx - (width / 2),
  });
  y += 22;

  // ── En-tête tableau ───────────────────────────────────────────────────────
  const tableW  = width - 2 * mx;
  const headerH = 22;

  // Colonnes (positions x absolues, largeurs)
  //   Désignation | Quantité | Prix unit. HT | Montant HT | TVA | Montant TTC
  const colDesX   = mx;
  const colDesW   = 170;
  const colQtyX   = colDesX + colDesW;
  const colQtyW   = 38;
  const colUnitX  = colQtyX + colQtyW;
  const colUnitW  = 75;
  const colHtX    = colUnitX + colUnitW;
  const colHtW    = 70;
  const colTvaX   = colHtX + colHtW;
  const colTvaW   = 40;
  const colTtcX   = colTvaX + colTvaW;
  const colTtcW   = (width - mx) - colTtcX;

  // Fond doré/olive en-tête
  fillRect(mx, y, tableW, headerH, golden);

  const hy = y + 15;
  txt("Designation",    colDesX  + 5, hy, { font: fontBold, size: 8, color: white });
  txt("Quantite",       colQtyX,      hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colQtyW - 4 });
  txt("Prix unit. HT",  colUnitX,     hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colUnitW - 4 });
  txt("Montant HT",     colHtX,       hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colHtW - 4 });
  txt("TVA",            colTvaX,      hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colTvaW - 4 });
  txt("Montant TTC",    colTtcX,      hy, { font: fontBold, size: 8, color: white, alignRight: true, maxWidth: colTtcW - 4 });
  y += headerH;

  // Bordure basse de l'en-tête
  hLine(y, mx, width - mx, golden, 1);

  // ── Lignes groupées par logement ──────────────────────────────────────────
  const groups  = groupLinesByLogement(invoice.lines);
  let   rowIdx  = 0;

  // Pour recalculer les totaux réels depuis les lignes
  let grandTotalHT  = 0;

  for (const g of groups) {
    // ── Titre de section logement ───────────────────────────────────────────
    const sectionH = 17;
    fillRect(mx, y, tableW, sectionH, sectionBg);
    txt(g.logementName, colDesX + 5, y + 12, {
      font: fontBold, size: 9, color: darkTeal,
    });
    y += sectionH;

    // ── Ligne interventions ménage ──────────────────────────────────────────
    if (g.menageCount > 0) {
      const rowH = 16;
      if (rowIdx % 2 === 0) fillRect(mx, y, tableW, rowH, stripeClr);

      const montantHT  = g.menageUnitHT * g.menageCount;
      const tvaAmt     = montantHT * TVA_RATE;
      const montantTTC = montantHT + tvaAmt;
      grandTotalHT    += montantHT;

      // Dates agrégées : "Intervention : 10/02 - 15/02 - 22/02"
      const rawDates  = `Intervention : ${g.menageDates.join(" - ")}`;
      // Tronquer si trop long pour la colonne désignation
      let datesLabel  = rawDates;
      const maxPx     = colDesW - 10;
      while (
        datesLabel.length > 20 &&
        fontRegular.widthOfTextAtSize(datesLabel, 8) > maxPx
      ) {
        datesLabel = datesLabel.slice(0, -1);
      }
      if (datesLabel.length < rawDates.length) datesLabel = datesLabel.slice(0, -3) + "...";

      const ly = y + 11;
      txt(datesLabel,                  colDesX  + 5, ly, { size: 8 });
      txt(String(g.menageCount),       colQtyX,      ly, { size: 8, alignRight: true, maxWidth: colQtyW  - 4 });
      txt(formatPrix(g.menageUnitHT),  colUnitX,     ly, { size: 8, alignRight: true, maxWidth: colUnitW - 4 });
      txt(formatPrix(montantHT),       colHtX,       ly, { size: 8, alignRight: true, maxWidth: colHtW   - 4 });
      txt("20%",                        colTvaX,      ly, { size: 8, alignRight: true, maxWidth: colTvaW  - 4 });
      txt(formatPrix(montantTTC),      colTtcX,      ly, { size: 8, alignRight: true, maxWidth: colTtcW  - 4 });
      y += rowH;
      rowIdx++;
    }

    // ── Ligne blanchisserie ─────────────────────────────────────────────────
    if (g.blanchisserie) {
      const rowH = 16;
      if (rowIdx % 2 === 0) fillRect(mx, y, tableW, rowH, stripeClr);

      const { unitHT, quantity } = g.blanchisserie;
      const montantHT  = unitHT * quantity;
      const tvaAmt     = montantHT * TVA_RATE;
      const montantTTC = montantHT + tvaAmt;
      grandTotalHT    += montantHT;

      const ly = y + 11;
      txt(g.blanchisserie.label,  colDesX  + 5, ly, { size: 8 });
      txt(String(quantity),        colQtyX,      ly, { size: 8, alignRight: true, maxWidth: colQtyW  - 4 });
      txt(formatPrix(unitHT),      colUnitX,     ly, { size: 8, alignRight: true, maxWidth: colUnitW - 4 });
      txt(formatPrix(montantHT),   colHtX,       ly, { size: 8, alignRight: true, maxWidth: colHtW   - 4 });
      txt("20%",                    colTvaX,      ly, { size: 8, alignRight: true, maxWidth: colTvaW  - 4 });
      txt(formatPrix(montantTTC),  colTtcX,      ly, { size: 8, alignRight: true, maxWidth: colTtcW  - 4 });
      y += rowH;
      rowIdx++;
    }

    // Sécurité : ne pas dépasser le bas de page
    if (y > height - 200) break;
  }

  // Bordure basse tableau
  hLine(y + 4, mx, width - mx, golden, 1);
  y += 20;

  // ── Totaux ────────────────────────────────────────────────────────────────
  // Recalcul cohérent : on utilise grandTotalHT calculé depuis les lignes
  const totalHT  = grandTotalHT;
  const totalTVA = totalHT * TVA_RATE;
  const totalTTC = totalHT + totalTVA;

  const totX  = width - mx - 210;
  const totW  = 210;
  const rightEdge = width - mx;

  // Total HT
  txt("Total HT",        totX,         y, { size: 9, color: muted });
  txt(formatPrix(totalHT), totX,       y, { size: 9, alignRight: true, maxWidth: totW - 4 });
  y += 15;

  // TVA 20%
  txt("TVA 20%",         totX,         y, { size: 9, color: muted });
  txt(formatPrix(totalTVA), totX,      y, { size: 9, alignRight: true, maxWidth: totW - 4 });
  y += 15;

  hLine(y, totX, rightEdge, golden, 1);
  y += 5;

  // Total TTC en gras — fond beige/doré
  const ttcH = 24;
  fillRect(totX, y, totW, ttcH, beigeClr);
  const ttcY = y + 17;
  txt("Total TTC",           totX + 6,  ttcY, { font: fontBold, size: 11, color: golden });
  txt(formatPrix(totalTTC),  totX,      ttcY, { font: fontBold, size: 11, color: golden, alignRight: true, maxWidth: totW - 6 });

  // ── Pied de page ──────────────────────────────────────────────────────────
  const footerY = 822;
  hLine(footerY - 16, mx, width - mx, golden, 1);
  txt(
    "TVA 20% appliquee sur toutes les prestations. " +
    "En cas de retard de paiement, une penalite egale a 3 fois le taux d interet legal sera appliquee.",
    mx,
    footerY - 4,
    { size: 6.5, color: muted }
  );
  txt(
    `Facture emise le ${formatDate(new Date().toISOString())}  |  ${companyName}  |  ${companyEmail}`,
    mx,
    footerY + 9,
    { size: 6.5, color: muted }
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
      throw new Error(`Erreur mise a jour pdf_url : ${updateError.message}`);
    }

    return NextResponse.json({ success: true, pdf_url: publicUrl });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
