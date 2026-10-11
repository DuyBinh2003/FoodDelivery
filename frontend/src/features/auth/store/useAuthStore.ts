import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role?: 'USER' | 'ADMIN';
  customerProfile?: Record<string, unknown>;
  driverProfile?: Record<string, unknown>;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      login: (user) => set({ isAuthenticated: true, user }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
