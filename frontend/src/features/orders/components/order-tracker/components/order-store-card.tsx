'use client';

import React from 'react';
import { Store, MapPin, FileText } from 'lucide-react';
import type { OrderStoreCardProps } from '../types';

export function OrderStoreCard({
  restaurantName,
  restaurantAddress,
  deliveryAddress,
  note,
}: OrderStoreCardProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-white/[0.08] p-5 shadow-lg shadow-black/20 backdrop-blur-md">
      <h3 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2 pb-2.5 border-b border-white/[0.06]">
        <Store className="w-4 h-4 text-orange-400" />
        Thông tin địa điểm
      </h3>

      <div className="space-y-4 text-xs">
        {/* Restaurant Info */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5 text-orange-400">
            <Store className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Nhà hàng chuẩn bị</span>
            <span className="font-semibold text-zinc-200 text-sm block mt-0.5">{restaurantName}</span>
            {restaurantAddress && (
              <span className="text-zinc-400 block mt-0.5 leading-relaxed">{restaurantAddress}</span>
            )}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Giao đến</span>
            <span className="font-semibold text-zinc-200 text-sm block mt-0.5">{deliveryAddress}</span>
          </div>
        </div>

        {/* Note if available */}
        {note && (
          <div className="flex items-start gap-3 pt-2 border-t border-white/[0.04]">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-zinc-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Ghi chú cho tài xế / quán</span>
              <span className="text-amber-300/90 italic block mt-0.5">&ldquo;{note}&rdquo;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
