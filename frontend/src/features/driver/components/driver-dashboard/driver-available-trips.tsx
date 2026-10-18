'use client';

import React, { useState } from 'react';
import {
  Bike,
  Store,
  MapPin,
  Clock,
  Navigation,
  RotateCcw,
  Loader2,
  CheckCircle2,
  PowerOff,
  Radio,
} from 'lucide-react';
import type { DriverTrip } from '@/features/driver/types/driver.types';

interface DriverAvailableTripsProps {
  trips: DriverTrip[];
  loading: boolean;
  isOnline?: boolean;
  onGoOnline?: () => void;
  onRefresh: () => void;
  onClaimTrip: (orderId: string) => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function DriverAvailableTrips({
  trips,
  loading,
  isOnline = true,
  onGoOnline,
  onRefresh,
  onClaimTrip,
}: DriverAvailableTripsProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (orderId: string) => {
    if (claimingId) return;
    try {
      setClaimingId(orderId);
      await onClaimTrip(orderId);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isOnline ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
            )}
            <span>
              {isOnline
                ? `Chuyến xe đang tìm tài xế (${trips.length})`
                : 'Chuyến xe đang tìm tài xế (Tạm dừng)'}
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            {isOnline
              ? 'Hệ thống phát tín hiệu theo thời gian thực (Atomic Claim - Ai bấm trước nhận trước)'
              : 'Tài xế đang ở trạng thái Ngoại tuyến. Bật Trực tuyến để bắt đầu nhận đơn.'}
          </p>
        </div>

        {isOnline && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        )}
      </div>

      {/* When Offline: Dedicated Premium Offline Status Banner */}
      {!isOnline ? (
        <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-amber-950/20 border border-amber-500/20 rounded-3xl p-8 sm:p-10 text-center shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
            <PowerOff className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Đang Ngoại Tuyến (OFFLINE)</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Hệ thống đang tạm dừng bắn đơn tới bạn
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
            Bạn đang ở chế độ ngoại tuyến. Các chuyến xe mới sẽ không được phân phối để đảm bảo bạn không bị làm phiền trong thời gian nghỉ ngơi. Chuyển sang trực tuyến bất cứ lúc nào để tiếp tục nhận cuốc!
          </p>
          {onGoOnline && (
            <button
              onClick={onGoOnline}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
            >
              <Radio className="w-4 h-4 text-zinc-950 animate-pulse" />
              <span>Bật Trực Tuyến Để Nhận Đơn</span>
            </button>
          )}
        </div>
      ) : loading && trips.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
          <p className="text-sm">Đang tìm các chuyến xe quanh bạn...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/40 border border-white/5 rounded-3xl p-8">
          <Bike className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-zinc-300 mb-1">Hiện chưa có chuyến xe mới</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Khi nhà hàng chuẩn bị xong món ăn, hệ thống sẽ phát tín hiệu chuyến xe tới đây ngay lập tức.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {trips.map((trip) => {
            const isClaiming = claimingId === trip.order_id;

            return (
              <div
                key={trip.id}
                className="bg-zinc-900/90 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-md transition-all relative overflow-hidden flex flex-col justify-between"
              >
                {/* Subtle top glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div>
                  {/* Card Header: Order ID & Time */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                        #{trip.order_id.slice(0, 8)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {formatDate(trip.created_at)}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                      <CheckCircle2 className="w-3 h-3" />
                      Món đã sẵn sàng
                    </span>
                  </div>

                  {/* Route Visualizer: Pickup -> Dropoff */}
                  <div className="space-y-3 relative mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{trip.pickup_name}</p>
                        <p className="text-xs text-zinc-400 line-clamp-1">{trip.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Địa chỉ giao hàng</p>
                        <p className="text-xs text-zinc-400 line-clamp-1">{trip.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items summary */}
                  {trip.items && trip.items.length > 0 && (
                    <div className="bg-white/5 rounded-xl p-3 mb-4 text-xs text-zinc-300">
                      <span className="font-semibold text-zinc-400 block mb-1">Món ăn cần lấy:</span>
                      <div className="space-y-1">
                        {trip.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.name || `Món ăn #${item.menu_item_id.slice(0, 6)}`}</span>
                            <span className="font-mono text-zinc-400">{formatCurrency(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: Driver Earnings & Claim Button */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4 mt-2">
                  <div>
                    <span className="text-xs text-zinc-400 block">Thu nhập tài xế</span>
                    <span className="text-xl font-extrabold text-amber-400 font-mono">
                      +{formatCurrency(trip.driver_earnings)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleClaim(trip.order_id)}
                    disabled={isClaiming}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {isClaiming ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    ) : (
                      <Navigation className="w-4 h-4 text-zinc-950" />
                    )}
                    <span>Nhận chuyến ngay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
