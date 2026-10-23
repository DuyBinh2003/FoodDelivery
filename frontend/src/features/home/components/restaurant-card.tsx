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
      className={`group relative rounded-xl bg-card border border-border hover:border-white/20 overflow-hidden transition-all duration-200 ${
        isGrid ? 'w-full flex flex-col' : 'w-60 sm:w-68 shrink-0 flex flex-col'
      }`}
    >
      {/* Thumbnail area with overlays */}
      <Link href={`/restaurant/${restaurant.id}`} className="relative block w-full h-34 sm:h-38 overflow-hidden bg-zinc-900">
        <Image
          src={imageUrl}
          alt={restaurant.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          loading="lazy"
          unoptimized={imageUrl.startsWith('http://localhost:4566')}
          className="object-cover group-hover:scale-103 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        {/* Promo / Discount Label */}
        {(restaurant.is_freeship || restaurant.discount_label) && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold tracking-tight shadow-xs">
            <Tag className="w-2.5 h-2.5" />
            <span>{restaurant.discount_label || 'FREESHIP 0Đ'}</span>
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-amber-400 text-[11px] font-medium border border-white/10">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>{displayRating}</span>
        </div>

        {/* ETA & Distance Pill */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-zinc-300 text-[11px] font-medium border border-white/10">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{formatEtaDisplay(restaurant.eta_minutes)}</span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/restaurant/${restaurant.id}`}>
            <h4 className="font-medium text-foreground text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {restaurant.name}
            </h4>
          </Link>

          <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">
            {restaurant.address || 'Quận 1, TP. Hồ Chí Minh'}
          </p>
        </div>

        {/* Bottom meta & action */}
        <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 text-zinc-300 font-normal text-[11px]">
            <Navigation className="w-3 h-3 text-primary/80" />
            <span>{formatDistanceDisplay(restaurant.distance_km)}</span>
          </div>

          {showOrderAgainButton ? (
            <button
              type="button"
              onClick={() => onOrderAgain && onOrderAgain(restaurant)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-medium text-xs transition-colors cursor-pointer active:scale-95 border border-primary/20"
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
