'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, Navigation, Tag, RotateCcw } from 'lucide-react';
import type { EnrichedRestaurantItem } from '../utils/home-feed.utils';
import { formatDistanceDisplay, formatEtaDisplay } from '../utils/home-feed.utils';

interface RestaurantCardProps {
  restaurant: EnrichedRestaurantItem;
  layout?: 'horizontal' | 'grid';
  showOrderAgainButton?: boolean;
  onOrderAgain?: (restaurant: EnrichedRestaurantItem) => void;
}

export function RestaurantCard({
  restaurant,
  layout = 'horizontal',
  showOrderAgainButton = false,
  onOrderAgain,
}: RestaurantCardProps) {
  const ratingNum = Number(restaurant.rating || 4.5);
  const displayRating = !isNaN(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '4.5';

  const defaultThumbnail =
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
  const imageUrl = restaurant.image_url || defaultThumbnail;

  const isGrid = layout === 'grid';

  return (
    <div
      className={`group relative rounded-2xl bg-zinc-900/90 border border-white/[0.08] hover:border-amber-500/30 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 ${
        isGrid ? 'w-full flex flex-col' : 'w-64 sm:w-72 shrink-0 flex flex-col'
      }`}
    >
      {/* Thumbnail area with overlays */}
      <Link href={`/restaurant/${restaurant.id}`} className="relative block w-full h-36 sm:h-40 overflow-hidden bg-zinc-800">
        <Image
          src={imageUrl}
          alt={restaurant.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          loading="lazy"
          unoptimized={imageUrl.startsWith('http://localhost:4566')}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Promo / Discount Label */}
        {(restaurant.is_freeship || restaurant.discount_label) && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white text-[11px] font-extrabold shadow-md tracking-tight">
            <Tag className="w-3 h-3" />
            <span>{restaurant.discount_label || 'FREESHIP 0Đ'}</span>
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-400 text-xs font-bold border border-white/10">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{displayRating}</span>
        </div>

        {/* ETA & Distance Pill */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-zinc-200 text-xs font-medium border border-white/10">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{formatEtaDisplay(restaurant.eta_minutes)}</span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/restaurant/${restaurant.id}`}>
            <h4 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-amber-400 transition-colors">
              {restaurant.name}
            </h4>
          </Link>

          <p className="text-zinc-400 text-xs line-clamp-1 mt-1">
            {restaurant.address || 'Quận 1, TP. Hồ Chí Minh'}
          </p>
        </div>

        {/* Bottom meta & action */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1 text-cyan-400 font-medium">
            <Navigation className="w-3 h-3" />
            <span>{formatDistanceDisplay(restaurant.distance_km)}</span>
          </div>

          {showOrderAgainButton ? (
            <button
              type="button"
              onClick={() => onOrderAgain && onOrderAgain(restaurant)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 font-bold text-xs transition-all cursor-pointer active:scale-95 border border-amber-500/30 hover:border-amber-500"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          ) : (
            <span className="text-[11px] text-zinc-500">
              {restaurant.categories?.[0]?.name || 'Ẩm thực'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
