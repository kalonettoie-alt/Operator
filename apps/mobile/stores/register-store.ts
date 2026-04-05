import { create } from 'zustand';

interface RegisterState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  setCredentials: (email: string, password: string) => void;
  setName: (firstName: string, lastName: string) => void;
  reset: () => void;
}

export const useRegisterStore = create<RegisterState>((set) => ({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  setCredentials: (email, password) => set({ email, password }),
  setName: (firstName, lastName) => set({ firstName, lastName }),
  reset: () => set({ email: '', password: '', firstName: '', lastName: '' }),
}));
