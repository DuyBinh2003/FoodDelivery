'use client';

import React from 'react';
import { Moon, Clock, AlertTriangle } from 'lucide-react';
import type { RestaurantOperatingStatus } from '@/features/restaurant/types/operating-hours.types';

interface RestaurantClosedBannerProps {
  status: RestaurantOperatingStatus | null;
}

export function RestaurantClosedBanner({ status }: RestaurantClosedBannerProps) {
  if (!status || status.isOpen) return null;

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-fade-in">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
          {status.reason === 'CLOSED' || status.reason === 'CLOSED_ALL_DAY' ? (
            <Moon className="w-5 h-5" />
          ) : status.reason === 'BREAK_TIME' ? (
            <Clock className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm sm:text-base">
              Quán hiện đang tạm đóng cửa
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {status.reason === 'BREAK_TIME'
                ? 'Nghỉ giữa ca'
                : status.reason === 'CLOSED_ALL_DAY'
                ? 'Nghỉ cả ngày'
                : 'Ngoài giờ mở cửa'}
            </span>
          </div>
          <p className="text-xs text-amber-200/80 mt-0.5">
            {status.message}
            {status.nextOpenTime && ` • Dự kiến mở cửa: ${status.nextOpenTime}`}
          </p>
        </div>
      </div>

      <div className="text-xs text-amber-400/90 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 self-stretch sm:self-auto text-center font-medium">
        Bạn vẫn có thể tham khảo thực đơn bên dưới
      </div>
    </div>
  );
}
