// lib/hooks/useInvoices.ts
// Hooks TanStack Query pour la gestion des factures (liste + génération).

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceLineRow = Database["public"]["Tables"]["invoice_lines"]["Row"];

// ─── Types enrichis ───────────────────────────────────────────────────────────

export interface InvoiceWithClient extends InvoiceRow {
  client: { id: string; full_name: string; email: string } | null;
}

export interface InvoiceDetail extends InvoiceRow {
  client: { id: string; full_name: string; email: string } | null;
  lines: InvoiceLineRow[];
}

// ─── Clé de cache ─────────────────────────────────────────────────────────────

const QUERY_KEY = "invoices";

// ─── Hook : liste des factures ─────────────────────────────────────────────

export function useInvoices(filters?: { clientId?: string; status?: string }) {
  return useQuery<InvoiceWithClient[]>({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          client:profiles!invoices_client_id_fkey(id, full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (filters?.clientId) query = query.eq("client_id", filters.clientId);
      if (filters?.status)   query = query.eq("status",    filters.status);

      const { data, error } = await query;
      if (error) throw new Error(error.message || JSON.stringify(error));
      return (data ?? []) as InvoiceWithClient[];
    },
  });
}

// ─── Type retour API de génération ────────────────────────────────────────────

export interface GenerateInvoicesResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
  invoices: InvoiceRow[];
  message?: string;
}

// ─── Hook : détail d'une facture (avec lignes) ────────────────────────────────

export function useInvoice(id: string) {
  return useQuery<InvoiceDetail>({
    queryKey: [QUERY_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          client:profiles!invoices_client_id_fkey(id, full_name, email),
          lines:invoice_lines(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message || JSON.stringify(error));
      return data as InvoiceDetail;
    },
  });
}

// ─── Mutation : générer le PDF d'une facture ─────────────────────────────────

export function useGeneratePdf() {
  const queryClient = useQueryClient();

  return useMutation<{ pdf_url: string }, Error, string>({
    mutationFn: async (invoiceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée — veuillez vous reconnecter");

      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });

      const data = await response.json() as { pdf_url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erreur lors de la génération du PDF");
      return { pdf_url: data.pdf_url! };
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, invoiceId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ─── Mutation : valider et envoyer une facture par email ─────────────────────

export interface SendInvoiceResult {
  success:  boolean;
  pdf_url:  string;
  due_date: string;
}

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation<SendInvoiceResult, Error, string>({
    mutationFn: async (invoiceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée — veuillez vous reconnecter");

      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await response.json() as SendInvoiceResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");
      return data;
    },
    onSuccess: (_, invoiceId) => {
      // Rafraîchir la facture concernée et la liste complète
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, invoiceId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ─── Mutation : déclencher un prélèvement SEPA pour une facture ──────────────

export interface ChargeInvoiceResult {
  success:           boolean;
  payment_intent_id: string;
  status:            string;
  amount_eur:        number;
}

export function useChargeInvoice() {
  const queryClient = useQueryClient();

  return useMutation<ChargeInvoiceResult, Error, string>({
    mutationFn: async (invoiceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée — veuillez vous reconnecter");

      const response = await fetch("/api/stripe/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      const data = await response.json() as ChargeInvoiceResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erreur lors du prélèvement");
      return data;
    },
    onSuccess: (_, invoiceId) => {
      // Rafraîchir la facture concernée et la liste complète
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, invoiceId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ─── Mutation : générer les factures pour une période ────────────────────────

export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation<
    GenerateInvoicesResult,
    Error,
    { period_start: string; period_end: string }
  >({
    mutationFn: async ({ period_start, period_end }) => {
      // Récupérer le token de session pour authentifier l'appel API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée — veuillez vous reconnecter");

      const response = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ period_start, period_end }),
      });

      const data = await response.json() as GenerateInvoicesResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erreur lors de la génération");
      return data;
    },
    onSuccess: () => {
      // Rafraîchir la liste des factures après génération
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
