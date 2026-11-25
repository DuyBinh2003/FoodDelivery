'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            {isOnline ? (
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
            )}
            <span>
              {isOnline
                ? `Chuyến xe đang tìm tài xế (${trips.length})`
                : 'Chuyến xe đang tìm tài xế (Tạm dừng)'}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isOnline
              ? 'Hệ thống phát tín hiệu theo thời gian thực (Atomic Claim - Ai bấm trước nhận trước)'
              : 'Tài xế đang ở trạng thái Ngoại tuyến. Bật Trực tuyến để bắt đầu nhận đơn.'}
          </p>
        </div>

        {isOnline && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card hover:bg-secondary text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Làm mới</span>
          </button>
        )}
      </div>

      {!isOnline ? (
        <div className="bg-card border border-amber-500/25 rounded-3xl p-8 sm:p-10 text-center shadow-xs relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/12 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <PowerOff className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Đang Ngoại Tuyến (OFFLINE)</span>
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">
            Hệ thống đang tạm dừng bắn đơn tới bạn
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            Bạn đang ở chế độ ngoại tuyến. Các chuyến xe mới sẽ không được phân phối để đảm bảo bạn không bị làm phiền trong thời gian nghỉ ngơi. Chuyển sang trực tuyến bất cứ lúc nào để tiếp tục nhận cuốc!
          </p>
          {onGoOnline && (
            <button
              type="button"
              onClick={onGoOnline}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Bật Trực Tuyến Để Nhận Đơn</span>
            </button>
          )}
        </div>
      ) : loading && trips.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm">Đang tìm các chuyến xe quanh bạn...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-3xl p-8">
          <Bike className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-heading text-base font-bold text-foreground mb-1">
            Hiện chưa có chuyến xe mới
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Khi nhà hàng chuẩn bị xong món ăn, hệ thống sẽ phát tín hiệu chuyến xe tới đây ngay lập tức.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {trips.map((trip) => {
            const isClaiming = claimingId === trip.order_id;

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-card border border-primary/25 hover:border-primary/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/12 border border-primary/25 px-2.5 py-1 rounded-lg">
                        #{trip.order_id.slice(0, 8)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(trip.created_at)}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 animate-pulse">
                      <CheckCircle2 className="w-3 h-3" />
                      Món đã sẵn sàng
                    </span>
                  </div>

                  <div className="space-y-3 relative mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/12 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{trip.pickup_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{trip.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/12 border border-primary/25 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-foreground">Địa chỉ giao hàng</p>
                          {trip.distance_km != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/12 text-primary border border-primary/25 shrink-0">
                              <Navigation className="w-3 h-3" />
                              {trip.distance_km} km
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{trip.dropoff_address}</p>
                        {trip.recipient_name && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            <span className="text-foreground font-semibold">{trip.recipient_name}</span>
                            {trip.recipient_phone && <span> • {trip.recipient_phone}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {trip.items && trip.items.length > 0 && (
                    <div className="bg-secondary/60 rounded-xl p-3 mb-4 text-xs text-foreground border border-border">
                      <span className="font-semibold text-muted-foreground block mb-1">Món ăn cần lấy:</span>
                      <div className="space-y-1">
                        {trip.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {item.quantity}x {item.name || `Món ăn #${item.menu_item_id.slice(0, 6)}`}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-4 mt-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>
                        Cước ship:{' '}
                        <strong className="text-foreground">{formatCurrency(trip.delivery_fee || 15000)}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-destructive font-medium">
                        Phí sàn (10%): -{formatCurrency(trip.platform_fee || 1500)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-primary font-semibold">Tài xế thực nhận:</span>
                      <span className="text-lg font-extrabold text-primary font-mono">
                        +{formatCurrency(trip.driver_earnings || 13500)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaim(trip.order_id)}
                    disabled={isClaiming}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isClaiming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    <span>Nhận chuyến ngay</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
