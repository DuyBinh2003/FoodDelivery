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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card border border-border p-3.5 sm:p-4 rounded-2xl shadow-xs">
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 border ${isOnline
              ? 'bg-primary/12 text-primary border-primary/25'
              : 'bg-secondary text-muted-foreground border-border'
            }`}
        >
          <Bike className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">
              {isOnline ? 'Đang Trực Tuyến' : 'Đang Ngoại Tuyến'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors border ${isOnline
                  ? 'bg-primary/12 text-primary border-primary/25'
                  : 'bg-secondary text-muted-foreground border-border'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary animate-ping' : 'bg-muted-foreground'
                  }`}
              />
              {isOnline ? 'Sẵn sàng nhận cuốc' : 'Tạm dừng nhận đơn'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {vehicleType || 'Xe máy'}{' '}
            {vehiclePlate && (
              <span className="font-mono text-foreground font-semibold">({vehiclePlate})</span>
            )}
          </p>
        </div>
      </div>

      <div className="sm:ml-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${isOnline
              ? 'bg-secondary hover:bg-muted text-foreground border border-border'
              : 'bg-primary hover:bg-primary-dark text-primary-foreground'
            }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang cập nhật...</span>
            </>
          ) : (
            <>
              <Power className={`w-4 h-4 ${isOnline ? 'text-destructive' : ''}`} />
              <span>{isOnline ? 'Tắt Trực Tuyến' : 'Bật Nhận Cuốc'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
