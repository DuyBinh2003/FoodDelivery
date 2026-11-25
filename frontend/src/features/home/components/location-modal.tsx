'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Home,
  Briefcase,
  Search,
  Check,
  X,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useLocationStore } from '../store/useLocationStore';
import type { UserAddress } from '@/features/address/types/address.types';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const {
    currentLocation,
    savedAddresses,
    isLoadingGps,
    gpsError,
    requestBrowserGps,
    selectSavedAddress,
    setLocation,
  } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleUseGps = async () => {
    const success = await requestBrowserGps();
    if (success) {
      onClose();
    }
  };

  const handleSelectAddress = (addr: UserAddress) => {
    selectSavedAddress(addr);
    onClose();
  };

  const handleManualAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLocation({
      address: searchQuery.trim(),
      label: 'Địa chỉ tìm kiếm',
      source: 'manual',
    });
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/12 text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Chọn địa chỉ giao hàng
              </h3>
              <p className="text-xs text-muted-foreground">
                Quán ăn và phí ship sẽ tự động tính theo vị trí này
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-xl bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isLoadingGps}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-primary/8 hover:bg-primary/14 border border-primary/25 text-primary font-semibold text-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                {isLoadingGps ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </div>
              <div className="text-left">
                <p className="text-foreground text-sm font-bold">
                  Dùng vị trí hiện tại (GPS)
                </p>
                <p className="text-xs text-primary font-medium">
                  Tự động định vị qua trình duyệt
                </p>
              </div>
            </div>
            {currentLocation.source === 'gps' && (
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Check className="w-4 h-4" />
              </span>
            )}
          </button>

          {gpsError && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Manual Address Search */}
        <form onSubmit={handleManualAddressSubmit} className="mb-5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Hoặc nhập địa chỉ mới
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Số nhà, tên đường, phường/xã..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 cursor-pointer transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </form>

        {/* Saved Addresses */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Địa chỉ đã lưu
            </span>
            <Link
              href="/profile/addresses"
              onClick={onClose}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Quản lý sổ địa chỉ
            </Link>
          </div>

          {savedAddresses.length === 0 ? (
            <div className="p-4 rounded-xl bg-secondary/50 border border-border text-center text-xs text-muted-foreground">
              Chưa có địa chỉ nào được lưu. Thêm địa chỉ trong phần hồ sơ để đặt món nhanh hơn.
            </div>
          ) : (
            savedAddresses.map((addr) => {
              const isSelected = currentLocation.address === addr.full_address;
              return (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => handleSelectAddress(addr)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-secondary/40 hover:bg-secondary border-border'
                    }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                      {addr.label?.toLowerCase().includes('nhà') ? (
                        <Home className="w-4 h-4" />
                      ) : addr.label?.toLowerCase().includes('công ty') ? (
                        <Briefcase className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>{addr.label || 'Địa chỉ'}</span>
                        {addr.is_default && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/12 text-primary text-[10px]">
                            Mặc định
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {addr.full_address}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
