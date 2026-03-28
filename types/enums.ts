// types/enums.ts — Source de vérité unique pour tous les statuts et constantes

// ---------------------------------------------------------------------------
// Statuts des interventions
// ---------------------------------------------------------------------------
export const INTERVENTION_STATUSES = {
  A_ATTRIBUER: 'a_attribuer',   // Créée, pas encore assignée à un prestataire
  ASSIGNEE: 'assignee',          // Prestataire sélectionné, en attente de réponse
  ACCEPTEE: 'acceptee',          // Prestataire a accepté
  REFUSEE: 'refusee',            // Prestataire a refusé
  EN_COURS: 'en_cours',          // Intervention démarrée
  TERMINEE: 'terminee',          // Intervention terminée avec rapport
  ANNULEE: 'annulee',            // Annulée par l'admin
} as const;

export type InterventionStatus =
  (typeof INTERVENTION_STATUSES)[keyof typeof INTERVENTION_STATUSES];

// ---------------------------------------------------------------------------
// Types d'interventions
// ---------------------------------------------------------------------------
export const INTERVENTION_TYPES = {
  MENAGE: 'menage',
  ETAT_LIEUX: 'etat_lieux',
  MAINTENANCE: 'maintenance',
} as const;

export type InterventionType =
  (typeof INTERVENTION_TYPES)[keyof typeof INTERVENTION_TYPES];

// ---------------------------------------------------------------------------
// Priorités des interventions
// ---------------------------------------------------------------------------
export const INTERVENTION_PRIORITIES = {
  NORMALE: 'normale',
  HAUTE: 'haute',
  URGENTE: 'urgente',
} as const;

export type InterventionPriority =
  (typeof INTERVENTION_PRIORITIES)[keyof typeof INTERVENTION_PRIORITIES];

// ---------------------------------------------------------------------------
// Rôles utilisateurs
// ---------------------------------------------------------------------------
export const USER_ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  PRESTATAIRE: 'prestataire',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// ---------------------------------------------------------------------------
// Statuts des factures (invoices)
// ---------------------------------------------------------------------------
export const INVOICE_STATUSES = {
  BROUILLON: 'brouillon',     // En cours de constitution
  ENVOYEE: 'envoyee',         // Envoyée au client
  PAYEE: 'payee',             // Paiement reçu
  ECHEC: 'echec',             // Paiement échoué
  ANNULEE: 'annulee',         // Annulée
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

// ---------------------------------------------------------------------------
// Statuts des virements prestataires (provider_payouts)
// ---------------------------------------------------------------------------
export const PAYOUT_STATUSES = {
  EN_ATTENTE: 'en_attente',   // Calculé, pas encore validé
  VALIDE: 'valide',            // Validé par l'admin
  PAYE: 'paye',                // Virement effectué
} as const;

export type PayoutStatus =
  (typeof PAYOUT_STATUSES)[keyof typeof PAYOUT_STATUSES];

// ---------------------------------------------------------------------------
// Statuts des réservations
// ---------------------------------------------------------------------------
export const RESERVATION_STATUSES = {
  CONFIRMEE: 'confirmee',
  ANNULEE: 'annulee',
} as const;

export type ReservationStatus =
  (typeof RESERVATION_STATUSES)[keyof typeof RESERVATION_STATUSES];

// ---------------------------------------------------------------------------
// Plateformes de réservation
// ---------------------------------------------------------------------------
export const RESERVATION_PLATFORMS = {
  AIRBNB: 'airbnb',
  BOOKING: 'booking',
  HOSPITABLE: 'hospitable',
  DIRECT: 'direct',
  AUTRE: 'autre',
} as const;

export type ReservationPlatform =
  (typeof RESERVATION_PLATFORMS)[keyof typeof RESERVATION_PLATFORMS];

// ---------------------------------------------------------------------------
// Types de sources de réservation
// ---------------------------------------------------------------------------
export const RESERVATION_SOURCE_TYPES = {
  ICAL: 'ical',
  WEBHOOK: 'webhook',
} as const;

export type ReservationSourceType =
  (typeof RESERVATION_SOURCE_TYPES)[keyof typeof RESERVATION_SOURCE_TYPES];

// ---------------------------------------------------------------------------
// Statuts SEPA (prestataires)
// ---------------------------------------------------------------------------
export const SEPA_STATUSES = {
  NON_CONFIGURE: 'non_configure',
  EN_ATTENTE: 'en_attente',
  ACTIF: 'actif',
  INVALIDE: 'invalide',
} as const;

export type SepaStatus =
  (typeof SEPA_STATUSES)[keyof typeof SEPA_STATUSES];

// ---------------------------------------------------------------------------
// Types de blanchisserie (logements)
// ---------------------------------------------------------------------------
export const BLANCHISSERIE_TYPES = {
  AUCUNE: 'aucune',
  INTERVENTION: 'intervention',  // Facturée par intervention
  FORFAIT: 'forfait',            // Forfait mensuel fixe
} as const;

export type BlanchisserieType =
  (typeof BLANCHISSERIE_TYPES)[keyof typeof BLANCHISSERIE_TYPES];
