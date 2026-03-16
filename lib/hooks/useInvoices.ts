// lib/hooks/useInvoices.ts
// Hooks TanStack Query pour la gestion des factures (liste + génération).

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

// ─── Type enrichi (avec nom client) ──────────────────────────────────────────

export interface InvoiceWithClient extends InvoiceRow {
  client: { id: string; full_name: string; email: string } | null;
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

      const response = await fetch("/api/admin/invoices/generate", {
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
