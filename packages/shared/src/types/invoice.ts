import type { InvoiceStatus, PayoutStatus } from '../constants/statuses';

export interface Invoice {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  management_fee: number;
  total: number;
  status: InvoiceStatus;
  invoice_number: string;
  sepa_payment_intent_id: string | null;
  sepa_batch_id: string | null;
  pdf_url: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface Payout {
  id: string;
  provider_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  status: PayoutStatus;
  stripe_transfer_id: string | null;
  sepa_batch_id: string | null;
  intervention_ids: string[];
  created_at: string;
  paid_at: string | null;
}
