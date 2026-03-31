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
 * Somme des prix_client_ttc (ménage uniquement) sur une liste d'interventions.
 * La blanchisserie est comptée séparément via calculateMonthlyBlanchisserie.
 * Ne comptabilise QUE les interventions terminées (status = 'terminee').
 * Les interventions en cours, assignées, annulées, etc. sont exclues.
 *
 * Relation garantie : calculateMonthlyRevenue + calculateMonthlyBlanchisserie - calculateMonthlyProviderCost = calculateMonthlyGain
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

// ─── Types pour les simulateurs ──────────────────────────────────────────────

export interface LogementSimulationInput {
  prix_client_ttc: number;
  prix_prestataire_ht: number;
  nb_interventions_mois: number;
  blanchisserie_incluse: boolean;
  prix_blanchisserie: number;
}

export interface LogementSimulationResult {
  revenuMensuel: number;
  coutMensuel: number;
  gainMensuel: number;
  gainAnnuel: number;
  margePercent: number;
}

export interface CroissanceSimulationInput {
  nbLogements: number;
  interventionsMoyennesParLogementMois: number;
  prixMoyenClient: number;
  prixMoyenPrestataire: number;
  maxDailyInterventionsParPresta: number;
}

export interface CroissanceSimulationResult {
  totalInterventionsMois: number;
  caMensuel: number;
  coutMensuel: number;
  gainMensuel: number;
  gainAnnuel: number;
  caAnnuel: number;
  margePercent: number;
  nbPrestatairesNecessaires: number;
}

// ─── Jours ouvrés (lun–sam) dans un mois ─────────────────────────────────────

/**
 * Compte les jours lundi à samedi dans un mois donné.
 * @param year  Année (ex: 2026)
 * @param month Mois 1-12
 */
export function countWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay(); // 0 = dim, 6 = sam
    if (day !== 0) count++; // tout sauf dimanche
  }
  return count;
}

// ─── Simulateur de rentabilité par logement ──────────────────────────────────

/**
 * Projette les revenus mensuels/annuels pour un logement donné.
 * Utilise calculateInterventionGain pour le calcul du gain par intervention.
 */
export function simulateLogementRevenue(
  input: LogementSimulationInput
): LogementSimulationResult {
  const {
    prix_client_ttc,
    prix_prestataire_ht,
    nb_interventions_mois,
    blanchisserie_incluse,
    prix_blanchisserie,
  } = input;

  const gainParIntervention = calculateInterventionGain({
    prix_client_ttc,
    prix_prestataire_ht,
    blanchisserie_incluse,
    prix_blanchisserie,
  });

  const revenuParIntervention =
    prix_client_ttc + (blanchisserie_incluse ? prix_blanchisserie : 0);

  const revenuMensuel = revenuParIntervention * nb_interventions_mois;
  const coutMensuel   = prix_prestataire_ht  * nb_interventions_mois;
  const gainMensuel   = gainParIntervention  * nb_interventions_mois;
  const gainAnnuel    = gainMensuel * 12;
  const margePercent  = revenuMensuel > 0 ? (gainMensuel / revenuMensuel) * 100 : 0;

  return { revenuMensuel, coutMensuel, gainMensuel, gainAnnuel, margePercent };
}

// ─── Simulateur de croissance ─────────────────────────────────────────────────

/**
 * Projette les métriques financières pour un parc de logements cible.
 * Estime le nombre de prestataires nécessaires sur une base de 26 jours ouvrés/mois.
 */
export function simulateCroissance(
  input: CroissanceSimulationInput
): CroissanceSimulationResult {
  const {
    nbLogements,
    interventionsMoyennesParLogementMois,
    prixMoyenClient,
    prixMoyenPrestataire,
    maxDailyInterventionsParPresta,
  } = input;

  const JOURS_OUVRES_MOYEN = 26;

  const totalInterventionsMois =
    nbLogements * interventionsMoyennesParLogementMois;
  const caMensuel    = totalInterventionsMois * prixMoyenClient;
  const coutMensuel  = totalInterventionsMois * prixMoyenPrestataire;
  const gainMensuel  = caMensuel - coutMensuel;
  const caAnnuel     = caMensuel  * 12;
  const gainAnnuel   = gainMensuel * 12;
  const margePercent = caMensuel > 0 ? (gainMensuel / caMensuel) * 100 : 0;

  const capaciteParPresta = maxDailyInterventionsParPresta * JOURS_OUVRES_MOYEN;
  const nbPrestatairesNecessaires =
    capaciteParPresta > 0
      ? Math.ceil(totalInterventionsMois / capaciteParPresta)
      : 0;

  return {
    totalInterventionsMois,
    caMensuel,
    coutMensuel,
    gainMensuel,
    gainAnnuel,
    caAnnuel,
    margePercent,
    nbPrestatairesNecessaires,
  };
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
