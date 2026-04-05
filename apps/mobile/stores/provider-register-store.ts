import { create } from 'zustand';

interface ProviderRegisterState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  siret: string;
  companyName: string;
  isAutoEntrepreneur: boolean;
  zones: string[];
  skills: string[];
  setCredentials: (email: string, password: string) => void;
  setIdentity: (firstName: string, lastName: string, phone: string) => void;
  setSiret: (siret: string, companyName: string, isAutoEntrepreneur: boolean) => void;
  setZonesSkills: (zones: string[], skills: string[]) => void;
  reset: () => void;
}

const INITIAL = {
  email: '', password: '',
  firstName: '', lastName: '', phone: '',
  siret: '', companyName: '', isAutoEntrepreneur: true,
  zones: [], skills: [],
};

export const useProviderRegisterStore = create<ProviderRegisterState>((set) => ({
  ...INITIAL,
  setCredentials: (email, password) => set({ email, password }),
  setIdentity: (firstName, lastName, phone) => set({ firstName, lastName, phone }),
  setSiret: (siret, companyName, isAutoEntrepreneur) => set({ siret, companyName, isAutoEntrepreneur }),
  setZonesSkills: (zones, skills) => set({ zones, skills }),
  reset: () => set(INITIAL),
}));
