import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';

export interface DriverProfile {
  id: string;
  user_id?: string;
  status: 'ONLINE' | 'OFFLINE';
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  vehicle_plate?: string | null;
  vehicle_type?: string | null;
  current_location_lat?: number | null;
  current_location_lng?: number | null;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  address?: string;
  is_active?: boolean;
  verification_status?: string;
  rating?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role?: 'USER' | 'ADMIN';
  customerProfile?: Record<string, unknown> | null;
  driverProfile?: DriverProfile | null;
  restaurant?: RestaurantInfo | null;
  hasDriver?: boolean;
  hasRestaurant?: boolean;
  driverRegistrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  restaurantRegistrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<User | null>;
  setDriverStatus: (status: 'ONLINE' | 'OFFLINE') => void;
  updateAvatar: (avatarUrl: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      login: (user) => set({ isAuthenticated: true, user }),
      logout: () => {
        document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'refresh_token=; path=/; max-age=0; SameSite=Lax';
        set({ isAuthenticated: false, user: null });
      },
      refreshProfile: async () => {
        try {
          const profile = await apiClient<User>('/users/profile');
          if (profile) {
            const customerName =
              (profile.customerProfile && typeof profile.customerProfile.full_name === 'string'
                ? profile.customerProfile.full_name
                : null) ||
              profile.name ||
              profile.email;

            const updatedUser: User = {
              ...profile,
              name: customerName,
            };
            set({ user: updatedUser, isAuthenticated: true });
            return updatedUser;
          }
          return null;
        } catch {
          return null;
        }
      },
      setDriverStatus: (status) => {
        const currentUser = get().user;
        if (currentUser && currentUser.driverProfile) {
          set({
            user: {
              ...currentUser,
              driverProfile: {
                ...currentUser.driverProfile,
                status,
              },
            },
          });
        }
      },
      updateAvatar: (avatarUrl: string) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              avatar_url: avatarUrl,
            },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
