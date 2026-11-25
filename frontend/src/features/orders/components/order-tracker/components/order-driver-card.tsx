'use client';

import React from 'react';
import { Phone, MessageSquare, ShieldCheck, Bike, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { OrderDriverCardProps } from '../types';

export function OrderDriverCard({ driver }: OrderDriverCardProps) {
  const handleCall = () => {
    if (driver.phone) {
      window.location.href = `tel:${driver.phone}`;
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-primary/25 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="success" className="gap-1.5 px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Tài xế nhận đơn
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Đã xác thực
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/12 px-2.5 py-0.5 rounded-full border border-amber-500/25">
          <Star className="w-3 h-3 fill-current" /> 4.9
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/12 border-2 border-primary/30 flex items-center justify-center font-heading font-extrabold text-xl text-primary">
              {driver.name.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-primary border-2 border-card flex items-center justify-center text-primary-foreground">
              <Bike className="w-3 h-3" />
            </div>
          </div>

          <div>
            <h3 className="font-heading text-base font-bold text-foreground tracking-tight">
              {driver.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="font-semibold text-foreground bg-secondary px-2 py-0.5 rounded border border-border font-mono tracking-wider">
                {driver.vehicle_plate || 'Chưa cập nhật biển số'}
              </span>
              <span>• {driver.vehicle_type || 'Chưa cập nhật loại xe'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            onClick={handleCall}
            className="text-xs h-9 px-3.5 rounded-xl gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            Gọi điện
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => alert(`Gửi tin nhắn nhanh tới tài xế: ${driver.name}`)}
            className="text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Nhắn tin
          </Button>
        </div>
      </div>
    </div>
  );
}
