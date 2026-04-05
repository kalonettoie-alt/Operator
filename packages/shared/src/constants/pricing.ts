// Grille tarifaire Deltom — Operator + City Operator

export type PropertyType = 'studio' | 'T2' | 'T3' | 'T4+';
export type OfferType = 'operator' | 'city_operator';

export const PRICING: Record<OfferType, Record<PropertyType, number>> = {
  operator: {
    studio: 45,
    T2: 55,
    T3: 65,
    'T4+': 80,
  },
  city_operator: {
    studio: 35,
    T2: 45,
    T3: 55,
    'T4+': 70,
  },
};

// Commission Deltom (%) par type d'offre
export const DELTOM_COMMISSION_RATE: Record<OfferType, number> = {
  operator: 0.3,       // 30%
  city_operator: 0.25, // 25%
};

// Frais de gestion mensuel (par logement)
export const MANAGEMENT_FEE = 1; // 1€/logement/mois

// Early check-in tarifs
export const EARLY_CHECKIN_SLOTS = [
  { hours: 1, price: 15, label: '1h avant' },
  { hours: 2, price: 25, label: '2h avant' },
  { hours: 3, price: 35, label: '3h avant' },
  { hours: 4, price: 45, label: '4h avant' },
] as const;

// Formation prestataire
export const FORMATION_PRICE = 50; // 50€

// Kit Operator
export const KIT_PRICE = 89; // 89€
