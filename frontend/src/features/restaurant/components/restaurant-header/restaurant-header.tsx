'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Star, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  Ticket, 
  Check, 
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useLocationStore } from '@/features/home/store/useLocationStore';
import { 
  calculateDistanceKm, 
  calculateRestaurantEtaMinutes, 
  formatDistanceDisplay, 
  formatEtaDisplay 
} from '@/features/home/utils/home-feed.utils';
import type { Restaurant } from '@/features/menu/types';

export interface RestaurantPromo {
  code: string;
  title: string;
  description: string;
  minOrder?: number;
  discountType: 'FIXED' | 'PERCENT' | 'FREESHIP';
  discountValue: number;
}

const DEFAULT_RESTAURANT_PROMOS: RestaurantPromo[] = [
  {
    code: 'FREESHIP',
    title: 'Freeship 0Đ',
    description: 'Miễn phí giao hàng cho đơn từ 100.000đ',
    minOrder: 100000,
    discountType: 'FREESHIP',
    discountValue: 15000,
  },
  {
    code: 'GIAM20K',
    title: 'Giảm 20.000đ',
    description: 'Áp dụng cho đơn hàng từ 150.000đ',
    minOrder: 150000,
    discountType: 'FIXED',
    discountValue: 20000,
  },
  {
    code: 'TIECNGON10',
    title: 'Giảm 10%',
    description: 'Giảm tối đa 30.000đ cho đơn từ 200.000đ',
    minOrder: 200000,
    discountType: 'PERCENT',
    discountValue: 10,
  },
];

interface RestaurantHeaderProps {
  restaurant: Restaurant;
}

export function RestaurantHeader({ restaurant }: RestaurantHeaderProps) {
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const [savedPromos, setSavedPromos] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dynamic calculations based on user GPS & restaurant GPS
  const distanceKm = calculateDistanceKm(
    currentLocation?.lat,
    currentLocation?.lng,
    restaurant.lat,
    restaurant.lon,
  );

  const etaMinutes = calculateRestaurantEtaMinutes(distanceKm);
  const formattedDistance = formatDistanceDisplay(distanceKm);
  const formattedEta = formatEtaDisplay(etaMinutes);

  // Delivery fee calculation
  const isFreeship = restaurant.is_freeship ?? false;
  const rawDeliveryFee = isFreeship 
    ? 0 
    : distanceKm > 2 
      ? 15000 + Math.ceil(distanceKm - 2) * 5000 
      : 15000;

  const displayDeliveryFee = isFreeship ? 'Miễn phí' : formatCurrency(rawDeliveryFee);

  const ratingValue = restaurant.rating ? Number(restaurant.rating).toFixed(1) : '4.8';
  const ratingCount = restaurant.rating_count || 180;

  const handleSavePromo = (promo: RestaurantPromo) => {
    if (savedPromos.includes(promo.code)) return;
    setSavedPromos((prev) => [...prev, promo.code]);
    setToastMsg(`Đã lưu mã "${promo.code}" vào ví voucher!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const coverImage = restaurant.banner_url ||
    restaurant.cover_url || 
    restaurant.image_url || 
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="relative w-full mb-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500/90 backdrop-blur-md text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xl border border-white/20 animate-in fade-in slide-in-from-top-3 duration-300">
          <Check className="w-4 h-4 text-white shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Closed Restaurant Banner Warning */}
      {!restaurant.is_active && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center gap-3 text-amber-300 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-bold">Nhà hàng hiện đang tạm ngưng nhận đơn:</span> Quán đang đóng cửa hoặc bận chế biến. Bạn vẫn có thể xem thực đơn nhưng nút thêm vào giỏ hàng sẽ bị khóa.
          </div>
        </div>
      )}

      {/* 2. Restaurant Hero Banner */}
      <section className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
        {/* Cover Graphic Image */}
        <div className="relative h-44 sm:h-60 md:h-72 w-full overflow-hidden bg-zinc-950">
          <Image
            src={coverImage}
            alt={restaurant.name}
            fill
            priority
            unoptimized
            sizes="(max-width: 1280px) 100vw, 1280px"
            className={`object-cover ${!restaurant.is_active ? 'grayscale contrast-75 brightness-75' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
        </div>

        {/* Identity Overlay Card */}
        <div className="relative -mt-16 sm:-mt-20 p-5 sm:p-8 pt-0 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 min-w-0">
            {/* Restaurant Avatar/Emblem */}
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-zinc-900 border-2 border-white/20 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center">
              <Image
                src={restaurant.image_url || coverImage}
                alt={restaurant.name}
                fill
                unoptimized
                sizes="112px"
                className={`object-cover ${!restaurant.is_active ? 'grayscale' : ''}`}
              />
            </div>

            {/* Title, Badges, Address */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {restaurant.name}
                </h1>
                {restaurant.verification_status === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đối tác chính hãng
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={
                    restaurant.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-medium'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 text-xs'
                  }
                >
                  {restaurant.is_active ? 'Đang mở cửa' : 'Tạm đóng'}
                </Badge>
              </div>

              {/* Address */}
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="line-clamp-1">{restaurant.address}</span>
              </div>

              {/* Dynamic Delivery Metric Row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 text-xs sm:text-sm">
                {/* Rating */}
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{ratingValue}</span>
                  <span className="text-zinc-500 font-normal">({ratingCount}+ đánh giá)</span>
                </div>

                <span className="text-zinc-700 hidden sm:inline">•</span>

                {/* Distance */}
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span>Cách {formattedDistance}</span>
                </div>

                <span className="text-zinc-700 hidden sm:inline">•</span>

                {/* ETA */}
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>{formattedEta}</span>
                </div>

                <span className="text-zinc-700 hidden sm:inline">•</span>

                {/* Delivery Fee */}
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>Phí ship: <strong className="font-bold text-white">{displayDeliveryFee}</strong></span>
                </div>
              </div>

              {/* Cuisine Categories */}
              {restaurant.categories && restaurant.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {restaurant.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-300"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Vouchers & Promos Carousel Banner */}
        <div className="px-5 sm:px-8 pb-6 pt-2 border-t border-white/5 bg-zinc-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Mã giảm giá độc quyền từ quán</span>
            </div>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Áp dụng tự động tại trang thanh toán khi đạt giá trị tối thiểu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DEFAULT_RESTAURANT_PROMOS.map((promo) => {
              const isSaved = savedPromos.includes(promo.code);
              return (
                <div
                  key={promo.code}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 via-zinc-900 to-zinc-900 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-200"
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 shrink-0 mt-0.5">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs sm:text-sm tracking-tight truncate">
                          {promo.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/10 text-orange-300 uppercase">
                          {promo.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {promo.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isSaved ? 'outline' : 'default'}
                    onClick={() => handleSavePromo(promo)}
                    disabled={isSaved}
                    className={`h-8 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                      isSaved
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                    }`}
                  >
                    {isSaved ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Đã lưu
                      </span>
                    ) : (
                      'Thu thập'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
