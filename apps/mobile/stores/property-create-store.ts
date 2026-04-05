import { create } from 'zustand';

interface PropertyCreateState {
  // Step 1 — Adresse
  address: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;

  // Step 2 — Type + offre + blanchisserie
  propertyType: 'studio' | 'T2' | 'T3' | 'T4+' | null;
  offerType: 'operator' | 'city_operator' | null;
  laundryEnabled: boolean;

  // Step 3 — Accès
  floor: number | null;
  hasElevator: boolean;
  hasKeyBox: boolean;
  keyBoxCode: string;
  hasSparKeys: boolean;
  accessCode: string;
  wifiCode: string;
  ownerReminder: string;
  // Capacité
  doubleBeds: number;
  singleBeds: number;
  sofaBeds: number;
  babyBeds: number;
  // Équipements
  balcony: boolean;
  parking: boolean;
  petsAllowed: boolean;
  jacuzzi: boolean;
  // Horaires
  checkinTime: string;
  checkoutTime: string;

  // Step 4 — Rapport photo
  photoReportEnabled: boolean;
  reportExtras: string[];

  // Step 5 — Consommables
  consumablesKits: ('lavant' | 'proprete' | 'bienvenue')[];

  // Step 6 — Page voyageur
  guestLinkEnabled: boolean;

  // Actions
  setAddress: (address: string, city: string, postalCode: string, lat: number, lng: number) => void;
  setPropertyType: (type: 'studio' | 'T2' | 'T3' | 'T4+') => void;
  setOfferType: (type: 'operator' | 'city_operator') => void;
  setLaundry: (enabled: boolean) => void;
  setDetails: (details: {
    floor: number | null; hasElevator: boolean;
    hasKeyBox: boolean; keyBoxCode: string; hasSparKeys: boolean;
    accessCode: string; wifiCode: string; ownerReminder: string;
    doubleBeds: number; singleBeds: number; sofaBeds: number; babyBeds: number;
    balcony: boolean; parking: boolean; petsAllowed: boolean; jacuzzi: boolean;
    checkinTime: string; checkoutTime: string;
  }) => void;
  setConsumables: (kits: ('lavant' | 'proprete' | 'bienvenue')[]) => void;
  setReport: (photoEnabled: boolean, extras: string[], guestLink: boolean) => void;
  reset: () => void;
}

const INITIAL: Omit<PropertyCreateState, 'setAddress' | 'setPropertyType' | 'setOfferType' | 'setLaundry' | 'setDetails' | 'setConsumables' | 'setReport' | 'reset'> = {
  address: '', city: '', postalCode: '', latitude: null, longitude: null,
  propertyType: null, offerType: null, laundryEnabled: false,
  floor: null, hasElevator: false,
  hasKeyBox: false, keyBoxCode: '', hasSparKeys: false,
  accessCode: '', wifiCode: '', ownerReminder: '',
  doubleBeds: 0, singleBeds: 0, sofaBeds: 0, babyBeds: 0,
  balcony: false, parking: false, petsAllowed: false, jacuzzi: false,
  checkinTime: '16:00', checkoutTime: '10:00',
  photoReportEnabled: true, reportExtras: [],
  consumablesKits: [],
  guestLinkEnabled: false,
};

export const usePropertyCreateStore = create<PropertyCreateState>((set) => ({
  ...INITIAL,
  setAddress: (address, city, postalCode, latitude, longitude) =>
    set({ address, city, postalCode, latitude, longitude }),
  setPropertyType: (propertyType) => set({ propertyType }),
  setOfferType: (offerType) => set({ offerType }),
  setLaundry: (laundryEnabled) => set({ laundryEnabled }),
  setDetails: (details) => set(details),
  setConsumables: (consumablesKits) => set({ consumablesKits }),
  setReport: (photoReportEnabled, reportExtras, guestLinkEnabled) =>
    set({ photoReportEnabled, reportExtras, guestLinkEnabled }),
  reset: () => set(INITIAL),
}));
