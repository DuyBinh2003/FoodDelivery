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

    // Thiết lập địa chỉ thủ công
    setLocation({
      address: searchQuery.trim(),
      label: 'Địa chỉ tìm kiếm',
      source: 'manual',
    });
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Chọn địa chỉ giao hàng</h3>
              <p className="text-xs text-zinc-400">Quán ăn và phí ship sẽ tự động tính theo vị trí này</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isLoadingGps ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-bold">Dùng vị trí hiện tại (GPS)</p>
                <p className="text-xs text-amber-400/80">Tự động định vị qua vệ tinh trình duyệt</p>
              </div>
            </div>
            {currentLocation.source === 'gps' && (
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </span>
            )}
          </button>

          {gpsError && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Search Address Bar */}
        <form onSubmit={handleManualAddressSubmit} className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập tên đường, tòa nhà hoặc số nhà..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
          />
        </form>

        {/* Saved Addresses List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
            <span>ĐỊA CHỈ ĐÃ LƯU</span>
            <Link
              href="/profile/addresses"
              onClick={onClose}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới</span>
            </Link>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {savedAddresses.length === 0 ? (
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center text-xs text-zinc-500">
                Chưa có địa chỉ nào được lưu. Bạn có thể thêm trong mục Quản lý Địa chỉ.
              </div>
            ) : (
              savedAddresses.map((addr) => {
                const isSelected =
                  currentLocation.address === (addr.full_address || addr.street_address);

                const IconComponent =
                  addr.label === 'HOME' ? Home : addr.label === 'WORK' ? Briefcase : MapPin;

                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectAddress(addr)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 text-zinc-950' : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">
                          {addr.label === 'HOME'
                            ? 'Nhà riêng'
                            : addr.label === 'WORK'
                            ? 'Công ty'
                            : addr.recipient_name || 'Địa chỉ giao hàng'}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {addr.full_address || addr.street_address}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
