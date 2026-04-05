import { create } from 'zustand';

type UserRole = 'client' | 'provider' | 'admin' | null;

interface AuthState {
  userId: string | null;
  role: UserRole;
  isLoading: boolean;
  setUserId: (id: string | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isLoading: true,
  setUserId: (userId) => set({ userId }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ userId: null, role: null }),
}));
