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
    <div className="rounded-2xl bg-card border border-border p-5 shadow-xs">
      <h3 className="font-heading text-sm font-bold text-foreground mb-3.5 flex items-center gap-2 pb-2.5 border-b border-border">
        <Store className="w-4 h-4 text-primary" />
        Thông tin địa điểm
      </h3>

      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-primary">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">
              Nhà hàng chuẩn bị
            </span>
            <span className="font-bold text-foreground text-sm block mt-0.5">
              {restaurantName}
            </span>
            {restaurantAddress && (
              <span className="text-muted-foreground block mt-0.5 leading-relaxed">
                {restaurantAddress}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">
              Giao đến
            </span>
            <span className="font-bold text-foreground text-sm block mt-0.5">
              {deliveryAddress}
            </span>
          </div>
        </div>

        {note && (
          <div className="flex items-start gap-3 pt-2 border-t border-border">
            <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Ghi chú cho tài xế / quán
              </span>
              <span className="text-foreground italic block mt-0.5">&ldquo;{note}&rdquo;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
