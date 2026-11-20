'use client';

import React from 'react';
import { Phone, MessageSquare, ShieldCheck, Bike, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { OrderDriverCardProps } from '../types';

export function OrderDriverCard({ driver, onOpenChat }: OrderDriverCardProps) {
  const handleCall = () => {
    if (driver.phone) {
      window.location.href = `tel:${driver.phone}`;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-emerald-500/25 p-5 shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Tài xế nhận đơn
          </Badge>
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Đã xác thực
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <Star className="w-3 h-3 fill-current" /> 4.9
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
        {/* Driver Profile Info */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-zinc-900 rounded-2xl flex items-center justify-center font-bold text-lg text-white">
                {driver.name.charAt(0)}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center text-white">
              <Bike className="w-3 h-3" />
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              {driver.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-300">
              <span className="font-semibold text-zinc-100 bg-white/10 px-2 py-0.5 rounded border border-white/10 font-mono tracking-wider">
                {driver.vehicle_plate || 'Chưa cập nhật biển số'}
              </span>
              <span className="text-zinc-400">• {driver.vehicle_type || 'Chưa cập nhật loại xe'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            onClick={handleCall}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-3.5 rounded-xl gap-1.5 shadow-md shadow-emerald-600/30"
          >
            <Phone className="w-3.5 h-3.5" />
            Gọi điện
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenChat}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            Nhắn tin
          </Button>
        </div>
      </div>
    </div>
  );
}
