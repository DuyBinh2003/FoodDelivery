'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserAddress } from '@/features/address/types/address.types';

export interface LocationState {
  address: string;
  lat: number;
  lng: number;
  label?: string;
  source: 'saved' | 'gps' | 'fallback' | 'manual';
}

interface LocationStore {
  currentLocation: LocationState;
  isLoadingGps: boolean;
  gpsError: string | null;
  savedAddresses: UserAddress[];

  setLocation: (loc: Partial<LocationState>) => void;
  requestBrowserGps: () => Promise<boolean>;
  selectSavedAddress: (addr: UserAddress) => void;
  syncUserAddresses: (addresses: UserAddress[]) => void;
}

const DEFAULT_LOCATION: LocationState = {
  address: 'Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  lat: 10.772545,
  lng: 106.702758,
  label: 'Khu vực Trung tâm',
  source: 'fallback',
};

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      currentLocation: DEFAULT_LOCATION,
      isLoadingGps: false,
      gpsError: null,
      savedAddresses: [],

      setLocation: (loc) => {
        set((state) => ({
          currentLocation: {
            ...state.currentLocation,
            ...loc,
          },
          gpsError: null,
        }));
      },

      selectSavedAddress: (addr) => {
        set({
          currentLocation: {
            address: addr.full_address || addr.street_address,
            lat: Number(addr.latitude),
            lng: Number(addr.longitude),
            label: addr.label === 'HOME' ? 'Nhà riêng' : addr.label === 'WORK' ? 'Công ty' : 'Địa chỉ đã lưu',
            source: 'saved',
          },
          gpsError: null,
        });
      },

      syncUserAddresses: (addresses) => {
        set({ savedAddresses: addresses });
        // Nếu user có địa chỉ mặc định và hiện tại đang ở fallback -> tự động chọn địa chỉ mặc định
        const currentSource = get().currentLocation.source;
        if (currentSource === 'fallback') {
          const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
          if (defaultAddr && defaultAddr.latitude && defaultAddr.longitude) {
            get().selectSavedAddress(defaultAddr);
          }
        }
      },

      requestBrowserGps: async () => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
          set({ gpsError: 'Trình duyệt không hỗ trợ định vị GPS' });
          return false;
        }

        set({ isLoadingGps: true, gpsError: null });

        return new Promise<boolean>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;

              let formattedAddress = 'Vị trí hiện tại của bạn';

              // Thử đảo ngược tọa độ (reverse geocoding) nhẹ nhàng qua Nominatim hoặc fallback
              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                  { headers: { 'Accept-Language': 'vi' } },
                );
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.display_name) {
                    const parts = data.display_name.split(', ');
                    formattedAddress = parts.slice(0, 3).join(', ');
                  }
                }
              } catch {
                // Ignore geocoding errors, fallback to default label
              }

              set({
                currentLocation: {
                  address: formattedAddress,
                  lat,
                  lng,
                  label: 'Vị trí GPS',
                  source: 'gps',
                },
                isLoadingGps: false,
                gpsError: null,
              });
              resolve(true);
            },
            (error) => {
              let msg = 'Không thể lấy vị trí hiện tại';
              if (error.code === error.PERMISSION_DENIED) {
                msg = 'Bạn đã từ chối quyền truy cập vị trí trên trình duyệt';
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                msg = 'Tín hiệu GPS không khả dụng';
              } else if (error.code === error.TIMEOUT) {
                msg = 'Hết thời gian chờ nhận tín hiệu định vị';
              }
              set({ isLoadingGps: false, gpsError: msg });
              resolve(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            },
          );
        });
      },
    }),
    {
      name: 'fd_user_location',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentLocation: state.currentLocation,
      }),
    },
  ),
);
