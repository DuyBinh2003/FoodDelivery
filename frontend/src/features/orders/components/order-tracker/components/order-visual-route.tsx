'use client';

import React from 'react';
import { Store, Home, Bike, Check, Navigation, Radio } from 'lucide-react';
import type { OrderVisualRouteProps } from '../types';

export function OrderVisualRoute({
  status,
  restaurantName,
  deliveryAddress,
  driverName,
}: OrderVisualRouteProps) {
  // Determine vehicle position percentage based on status
  let vehiclePercent = 10;
  if (status === 'COOKING') vehiclePercent = 15;
  if (status === 'READY_FOR_PICKUP') vehiclePercent = 25;
  if (status === 'DELIVERING') vehiclePercent = 65;
  if (status === 'COMPLETED') vehiclePercent = 92;

  const isDelivering = status === 'DELIVERING';
  const isCompleted = status === 'COMPLETED';
  const isFindingDriver = status === 'READY_FOR_PICKUP';

  return (
    <div className="rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] p-5 shadow-xl shadow-black/30 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Lộ trình di chuyển trực quan</h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          {isDelivering ? 'Khoảng cách ~ 2.4 km' : isCompleted ? 'Đã đến điểm giao' : 'Đang chuẩn bị'}
        </span>
      </div>

      {/* Visual Map Simulation Track */}
      <div className="relative py-6 px-4 bg-zinc-950/60 rounded-xl border border-white/[0.04] overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Route Line Track */}
        <div className="relative h-2 bg-zinc-800/80 rounded-full my-6">
          {/* Active Line Fill */}
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
              isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500'
            }`}
            style={{ width: `${vehiclePercent}%` }}
          />

          {/* Restaurant Node (Left) */}
          <div className="absolute -top-4 -left-2 flex flex-col items-center">
            <div className="relative w-10 h-10 rounded-xl bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center text-orange-400 shadow-md shadow-orange-500/20 z-10 bg-zinc-900">
              <Store className="w-5 h-5" />
              {isFindingDriver && (
                <span className="absolute -inset-1 rounded-xl border-2 border-orange-400 animate-ping opacity-75" />
              )}
            </div>
            <span className="mt-2 text-[11px] font-semibold text-zinc-300 max-w-[100px] truncate text-center">
              {restaurantName}
            </span>
          </div>

          {/* Moving Vehicle Node */}
          {!isCompleted && (
            <div
              className="absolute -top-4.5 -translate-x-1/2 transition-all duration-1000 z-20"
              style={{ left: `${vehiclePercent}%` }}
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xl ${
                    isDelivering
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/40 ring-4 ring-emerald-500/20 animate-pulse'
                      : isFindingDriver
                      ? 'bg-gradient-to-br from-indigo-500 to-sky-600 shadow-indigo-500/30'
                      : 'bg-zinc-800 border border-white/20 text-zinc-400'
                  }`}
                >
                  {isFindingDriver ? (
                    <Radio className="w-5 h-5 animate-spin" />
                  ) : (
                    <Bike className="w-5 h-5" />
                  )}
                </div>

                {isDelivering && (
                  <span className="mt-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap shadow-sm">
                    {driverName ? `${driverName} đang đến` : 'Tài xế đang giao'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Customer Node (Right) */}
          <div className="absolute -top-4 -right-2 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center z-10 bg-zinc-900 transition-colors ${
                isCompleted
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : <Home className="w-5 h-5" />}
            </div>
            <span className="mt-2 text-[11px] font-semibold text-zinc-300 max-w-[120px] truncate text-center">
              Điểm nhận hàng
            </span>
          </div>
        </div>

        {/* Origin & Destination Labels */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-white/[0.04] text-xs">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">Nơi lấy món:</div>
            <div className="text-zinc-300 font-medium truncate mt-0.5">{restaurantName}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">Địa chỉ giao:</div>
            <div className="text-zinc-300 font-medium truncate mt-0.5" title={deliveryAddress}>
              {deliveryAddress}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
