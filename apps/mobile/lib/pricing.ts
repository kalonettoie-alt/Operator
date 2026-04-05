export type PropertyType = 'studio' | 'T2' | 'T3' | 'T4+';
export type OfferType = 'operator' | 'city_operator';

// Tarifs OPERATOR (sans blanchisserie)
const OPERATOR_BASE: Record<PropertyType, number> = {
  studio: 29,
  T2: 39,
  T3: 49,
  'T4+': 59,
};

// Supplément blanchisserie OPERATOR
const LAUNDRY_EXTRA: Record<PropertyType, number> = {
  studio: 14,
  T2: 16,
  T3: 18,
  'T4+': 20,
};

// Tarifs CITY OPERATOR (blanchisserie incluse)
const CITY_OPERATOR_BASE: Record<PropertyType, number> = {
  studio: 59,
  T2: 69,
  T3: 79,
  'T4+': 89,
};

export function calculatePrice(
  propertyType: PropertyType,
  offerType: OfferType,
  laundry: boolean
): number {
  if (offerType === 'city_operator') return CITY_OPERATOR_BASE[propertyType];
  return OPERATOR_BASE[propertyType] + (laundry ? LAUNDRY_EXTRA[propertyType] : 0);
}

export function getLaundryExtra(propertyType: PropertyType): number {
  return LAUNDRY_EXTRA[propertyType];
}

export const OPERATOR_FEATURES = [
  'Nettoyage professionnel',
  'Opérateurs certifiés (standard Airbnb/hôtelier)',
  'Suivi en temps réel sur l\'app',
  'Rapport photo horodaté',
  'Check-list Airbnb / Booking',
];

export const CITY_OPERATOR_FEATURES = [
  'Tout l\'offre Operator',
  'Blanchisserie incluse',
  'Supervision qualité continue',
  'Gestion incidents & dégâts',
  'Service client voyageurs (8h–23h)',
  'Ménage de fond récurrent',
  'Coordination réparations',
  'Priorité check-in / check-out',
];
