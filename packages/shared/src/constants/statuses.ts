export const INTERVENTION_STATUSES = [
  'pending',
  'assigned',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
] as const;

export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  pending: 'En attente',
  assigned: 'Assignée',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'Litige',
};

export const USER_ROLES = ['client', 'provider', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROVIDER_STATUSES = ['pending', 'active', 'suspended'] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const INVOICE_STATUSES = ['draft', 'sent', 'pending_payment', 'paid', 'failed'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYOUT_STATUSES = ['pending', 'ready_to_transfer', 'validated', 'paid', 'failed'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const EARLY_CHECKIN_STATUSES = ['requested', 'approved', 'paid', 'refused', 'expired'] as const;
export type EarlyCheckinStatus = (typeof EARLY_CHECKIN_STATUSES)[number];

export const PAGE_SIZE = 20;
