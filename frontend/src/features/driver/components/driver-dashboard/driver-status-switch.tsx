'use client';

import React, { useState } from 'react';
import { Power, Loader2, Bike } from 'lucide-react';
import type { DriverStatus } from '@/features/driver/types/driver.types';

interface DriverStatusSwitchProps {
  status: DriverStatus;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  onToggle: (newStatus: DriverStatus) => Promise<void>;
}

export function DriverStatusSwitch({
  status,
  vehiclePlate,
  vehicleType,
  onToggle,
}: DriverStatusSwitchProps) {
  const [loading, setLoading] = useState(false);
  const isOnline = status === 'ONLINE';

  const handleToggle = async () => {
    if (loading) return;
    const nextStatus: DriverStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    try {
      setLoading(true);
      await onToggle(nextStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-zinc-900/90 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-xl">
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isOnline
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
        >
          <Bike className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {isOnline ? 'Đang Trực Tuyến' : 'Đang Ngoại Tuyến'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                }`}
              />
              {isOnline ? 'Sẵn sàng nhận cuốc' : 'Tạm dừng nhận đơn'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {vehicleType || 'Xe máy'}{' '}
            {vehiclePlate && (
              <span className="font-mono text-zinc-300 font-medium">({vehiclePlate})</span>
            )}
          </p>
        </div>
      </div>

      <div className="sm:ml-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
            isOnline
              ? 'bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-zinc-300 border border-zinc-700 hover:text-white'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Đang cập nhật...</span>
            </>
          ) : (
            <>
              <Power className={`w-4 h-4 ${isOnline ? 'text-red-400' : 'text-white'}`} />
              <span>{isOnline ? 'Tắt Trực Tuyến' : 'Bật Nhận Cuốc'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
