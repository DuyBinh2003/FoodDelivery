'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Store,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import type { DriverTrip } from '@/features/driver/types/driver.types';
import { OrderLiveChatWidget } from '@/features/orders/components/OrderLiveChatWidget';

interface DriverTripCardProps {
  trip: DriverTrip;
  onCompleteTrip?: (orderId: string) => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFullDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
};

export function DriverTripCard({ trip, onCompleteTrip }: DriverTripCardProps) {
  const [showItems, setShowItems] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const getStatusBadge = () => {
    switch (trip.status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn thành
          </span>
        );
      case 'DELIVERING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Navigation className="w-3.5 h-3.5" />
            Đang giao hàng
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Món đã sẵn sàng
          </span>
        );
      case 'COOKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="w-3.5 h-3.5" />
            Đang chuẩn bị
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Đã nhận đơn
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {trip.status}
          </span>
        );
    }
  };

  const handleComplete = async () => {
    if (!onCompleteTrip || completing) return;
    try {
      setCompleting(true);
      await onCompleteTrip(trip.order_id);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/20">
      {/* Top Header: Order ID, Driver Milestone Timestamps & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs font-mono font-medium text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            #{trip.order_id.slice(0, 8)}
          </div>
          {trip.claimed_at && trip.completed_at ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Nhận: <span className="font-semibold text-white">{formatTime(trip.claimed_at)}</span>
              </span>
              <span className="text-zinc-500">➔</span>
              <span>
                Giao: <span className="font-semibold text-emerald-400">{formatTime(trip.completed_at)}</span>
              </span>
              <span className="text-zinc-500 text-[11px]">({formatFullDate(trip.completed_at)})</span>
              {trip.duration_minutes && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">
                  ⚡ {trip.duration_minutes} phút
                </span>
              )}
            </div>
          ) : trip.claimed_at ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Nhận cuốc: <span className="font-semibold text-white">{formatTime(trip.claimed_at)}</span> ({formatFullDate(trip.claimed_at)})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formatDate(trip.created_at)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
        </div>
      </div>

      {/* Route Timeline: Pickup -> Dropoff */}
      <div className="py-4 space-y-4">
        {/* Pickup */}
        <div className="flex items-start gap-3 relative">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="w-0.5 h-8 bg-zinc-700/60 my-1 border-dashed" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Điểm Đón (Lấy món)
              </span>
            </div>
            <div className="text-sm font-semibold text-white truncate mt-0.5">
              {trip.pickup_name}
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate">{trip.pickup_address}</span>
            </p>
          </div>
        </div>

        {/* Dropoff */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                Điểm Đến (Giao khách)
              </span>
              {trip.distance_km != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <Navigation className="w-3 h-3" />
                  {trip.distance_km} km
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-zinc-200 mt-0.5">
              {trip.dropoff_address}
            </div>
            {trip.recipient_name && (
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                <span className="text-zinc-300 font-medium">{trip.recipient_name}</span>
                {trip.recipient_phone && <span>• {trip.recipient_phone}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Financials & Items Toggle */}
      <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Cước ship: <strong className="text-zinc-200">{formatCurrency(trip.delivery_fee || 15000)}</strong></span>
              <span>•</span>
              <span className="text-red-400/90 font-medium">Phí sàn (10%): -{formatCurrency(trip.platform_fee || 1500)}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-emerald-400 font-semibold">Tài xế thực nhận:</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                +{formatCurrency(trip.driver_earnings || 13500)}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <div className="hidden sm:block">
            <span className="text-xs text-zinc-400 block">Tổng đơn:</span>
            <span className="text-sm font-medium text-zinc-300">
              {formatCurrency(trip.total_amount)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && (
            <button
              onClick={() => setShowChat((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 transition-all cursor-pointer shadow-sm shadow-orange-500/10 active:scale-95"
              title="Nhắn tin trực tiếp với khách hàng"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Khách</span>
            </button>
          )}

          {trip.items && trip.items.length > 0 && (
            <button
              onClick={() => setShowItems(!showItems)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span>{trip.items.length} món</span>
              {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {trip.status === 'DELIVERING' && onCompleteTrip && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {completing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Hoàn Thành Cuốc</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Driver-Customer Live Chat Widget */}
      {trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && (
        <OrderLiveChatWidget
          orderId={trip.order_id}
          role="DRIVER"
          driverName={trip.recipient_name || 'Khách hàng'}
          restaurantName={trip.pickup_name}
          isOpen={showChat}
          onOpenChange={setShowChat}
        />
      )}

      {/* Expandable Items List */}
      {showItems && trip.items && trip.items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 bg-zinc-950/50 rounded-xl p-3 space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Danh sách món ăn
          </span>
          {trip.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-zinc-400 font-medium">
                  {item.quantity}x
                </span>
                <span>{item.name || `Món #${item.menu_item_id.slice(0, 6)}`}</span>
              </span>
              <span className="text-zinc-400">{formatCurrency(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Attached Customer Review (If exists) */}
      {trip.review && trip.review.driver_rating && (
        <div className="mt-3 pt-3 border-t border-white/5 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <span>Đánh giá từ khách hàng:</span>
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= (trip.review?.driver_rating || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
          {trip.review.comment && (
            <p className="text-xs text-zinc-300 italic">
              &ldquo;{trip.review.comment}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
