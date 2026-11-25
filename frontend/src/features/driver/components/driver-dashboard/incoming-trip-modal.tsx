'use client';

import React, { useEffect, useState } from 'react';
import {
  Bike,
  Store,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';

export interface TripOfferData {
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  distanceKm: number;
  deliveryFee: number;
  driverEarnings: number;
  itemsCount: number;
  timeoutSeconds: number;
  expiresAt: number;
}

interface IncomingTripModalProps {
  offer: TripOfferData | null;
  onAccept: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason?: string) => Promise<void>;
  onTimeout: (orderId: string) => void;
}

import {
  formatDriverEarnings,
  formatTripDistance,
  getCountdownColor,
} from '@/features/driver/utils/dispatch.utils';

interface ContentProps {
  offer: TripOfferData;
  onAccept: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason?: string) => Promise<void>;
  onTimeout: (orderId: string) => void;
}

function IncomingTripModalContent({
  offer,
  onAccept,
  onReject,
  onTimeout,
}: ContentProps) {
  const [secondsLeft, setSecondsLeft] = useState(offer.timeoutSeconds ?? 15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialSeconds = offer.timeoutSeconds ?? 15;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout(offer.orderId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offer.orderId, onTimeout]);

  const percentLeft = Math.max(0, Math.min(100, Math.round((secondsLeft / initialSeconds) * 100)));

  const countdownColor = getCountdownColor(secondsLeft);
  const progressColor =
    countdownColor === 'green'
      ? 'from-emerald-500 to-teal-400'
      : countdownColor === 'amber'
      ? 'from-amber-500 to-orange-400'
      : 'from-red-500 to-rose-500 animate-pulse';

  const handleAcceptClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAccept(offer.orderId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onReject(offer.orderId, 'Tài xế bấm bỏ qua');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-primary/30 bg-card text-card-foreground p-6 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* 15s Countdown Bar at Top */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-5">
          <div
            className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>

        {/* Header: Incoming Ping Alert & Timer Pill */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bike className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 animate-ping" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                Cuốc Xe Mới Cho Bạn
              </span>
              <h3 className="text-base font-extrabold text-foreground">
                Đơn #{offer.orderId.slice(0, 8)}
              </h3>
            </div>
          </div>

          {/* Countdown Clock Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border font-mono text-sm font-bold text-foreground shadow-inner">
            <Clock className={`w-4 h-4 ${secondsLeft <= 4 ? 'text-destructive animate-spin' : 'text-amber-500'}`} />
            <span className={secondsLeft <= 4 ? 'text-destructive' : 'text-foreground'}>
              {secondsLeft}s
            </span>
          </div>
        </div>

        {/* Earnings Card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-500/5 border border-primary/25 p-4 mb-5 text-center">
          <p className="text-xs text-primary font-semibold uppercase tracking-wide">
            Thu Nhập Tài Xế Thực Nhận
          </p>
          <div className="text-3xl font-black text-primary font-mono tracking-tight mt-0.5 tabular-nums">
            +{formatDriverEarnings(offer.driverEarnings)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cước ship {formatDriverEarnings(offer.deliveryFee)} • Phí sàn 10%
          </p>
        </div>

        {/* Route Details */}
        <div className="space-y-3.5 bg-muted/50 rounded-2xl p-4 border border-border mb-6 text-xs">
          {/* Pickup location */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Store className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-foreground text-sm truncate">{offer.restaurantName}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                  Lấy món
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-1 mt-0.5">{offer.restaurantAddress}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border pl-10 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span>Lộ trình giao hàng:</span>
            <span className="text-primary font-bold flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {formatTripDistance(offer.distanceKm)}
            </span>
          </div>

          {/* Dropoff location */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-foreground text-sm">Điểm giao hàng</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold shrink-0">
                  Giao khách
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-1 mt-0.5">{offer.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleRejectClick}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            <span>Bỏ qua</span>
          </button>

          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/25 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang nhận...' : 'Chấp nhận cuốc'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomingTripModal(props: IncomingTripModalProps) {
  if (!props.offer) return null;
  return (
    <IncomingTripModalContent
      key={props.offer.orderId}
      offer={props.offer}
      onAccept={props.onAccept}
      onReject={props.onReject}
      onTimeout={props.onTimeout}
    />
  );
}
