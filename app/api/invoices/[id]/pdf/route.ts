// app/api/invoices/[id]/pdf/route.ts
// Génère le PDF d'une facture, l'uploade dans Supabase Storage (bucket "factures"),
// met à jour invoice.pdf_url et retourne l'URL publique.
//
// POST /api/invoices/:id/pdf
// Authentification : Bearer token Supabase + rôle admin requis.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { buildPdf } from "@/lib/invoices/pdf";
import type { InvoiceWithDetails } from "@/lib/invoices/pdf";
import * as Sentry from "@sentry/nextjs";

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
