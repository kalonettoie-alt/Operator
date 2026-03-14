// lib/utils/finance.ts — SEUL endroit pour les calculs financiers.
// JAMAIS dupliquer ces calculs dans les composants.
// Chaque fonction a un test correspondant dans __tests__/finance.test.ts

import { INTERVENTION_STATUSES } from "@/types/enums";

// ─── Type minimal pour les calculs ───────────────────────────────────────────
// Utilise un sous-type pour ne pas dépendre de Supabase dans les tests.

export interface InterventionForFinance {
  prix_client_ttc: number | null;
  prix_prestataire_ht: number | null;
  blanchisserie_incluse: boolean | null;
  prix_blanchisserie: number | null;
  status?: string;
}

// ─── Calcul du gain par intervention ─────────────────────────────────────────

/**
 * Gain net = ce que rapporte l'intervention à Deltom.
 * = prix_client_ttc + prix_blanchisserie (si incluse) - prix_prestataire_ht
 */
export function calculateInterventionGain(
  intervention: InterventionForFinance
): number {
  const blanchisserie = intervention.blanchisserie_incluse
    ? (intervention.prix_blanchisserie ?? 0)
    : 0;
  return (
    (intervention.prix_client_ttc ?? 0) +
    blanchisserie -
    (intervention.prix_prestataire_ht ?? 0)
  );
}

// ─── Calcul du chiffre d'affaires client (mois) ───────────────────────────────

/**
 * Somme des prix_client_ttc sur une liste d'interventions.
 * Ne comptabilise QUE les interventions terminées (status = 'terminee').
 * Les interventions en cours, assignées, annulées, etc. sont exclues.
 */
export function calculateMonthlyRevenue(
  interventions: InterventionForFinance[]
): number {
  return interventions
    .filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE)
    .reduce((sum, i) => sum + (i.prix_client_ttc ?? 0), 0);
}

// ─── Calcul du coût prestataires (mois) ──────────────────────────────────────

/**
 * Somme des prix_prestataire_ht sur une liste d'interventions.
 * Ne comptabilise QUE les interventions terminées (status = 'terminee').
 */
export function calculateMonthlyProviderCost(
  interventions: InterventionForFinance[]
): number {
  return interventions
    .filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE)
    .reduce((sum, i) => sum + (i.prix_prestataire_ht ?? 0), 0);
}

// ─── Calcul du revenu blanchisserie (mois) ────────────────────────────────────

/**
 * Somme des prix_blanchisserie quand blanchisserie_incluse = true.
 * Ne comptabilise QUE les interventions terminées (status = 'terminee').
 */
export function calculateMonthlyBlanchisserie(
  interventions: InterventionForFinance[]
): number {
  return interventions
    .filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE && i.blanchisserie_incluse)
    .reduce((sum, i) => sum + (i.prix_blanchisserie ?? 0), 0);
}

// ─── Calcul de la facture estimée côté client (mois) ─────────────────────────

/**
 * Ce que le client doit payer ce mois-ci.
 * = somme de (prix_client_ttc + prix_blanchisserie si incluse) pour chaque intervention terminée.
 * Utilisé dans le dashboard client — différent du calculateMonthlyRevenue admin.
 */
export function calculateClientMonthlyBilling(
  interventions: InterventionForFinance[]
): number {
  return interventions
    .filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE)
    .reduce((sum, i) => {
      const menage = i.prix_client_ttc ?? 0;
      const blanchisserie = i.blanchisserie_incluse ? (i.prix_blanchisserie ?? 0) : 0;
      return sum + menage + blanchisserie;
    }, 0);
}

// ─── Calcul du gain mensuel total ────────────────────────────────────────────

/**
 * Gain total du mois = somme des gains de chaque intervention terminée.
 * Ne comptabilise QUE les interventions terminées (status = 'terminee').
 */
export function calculateMonthlyGain(
  interventions: InterventionForFinance[]
): number {
  return interventions
    .filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE)
    .reduce((sum, i) => sum + calculateInterventionGain(i), 0);
}
