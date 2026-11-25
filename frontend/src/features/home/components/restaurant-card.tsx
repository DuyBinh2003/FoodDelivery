'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/8 overflow-hidden transition-colors duration-200 ${
        isGrid ? 'w-full flex flex-col' : 'w-64 sm:w-72 shrink-0 flex flex-col'
      }`}
    >
      {/* Thumbnail area with overlays */}
      <Link
        href={`/restaurant/${restaurant.id}`}
        className="relative block w-full h-40 sm:h-44 overflow-hidden bg-muted"
      >
        <Image
          src={imageUrl}
          alt={restaurant.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
          loading="lazy"
          unoptimized={imageUrl.startsWith('http://localhost:4566')}
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        {/* Promo / Discount Label */}
        {(restaurant.is_freeship || restaurant.discount_label) && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold tracking-tight shadow-sm">
            <Tag className="w-3 h-3" />
            <span>{restaurant.discount_label || 'FREESHIP 0Đ'}</span>
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/15">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>{displayRating}</span>
        </div>

        {/* ETA Pill */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold border border-white/15">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{formatEtaDisplay(restaurant.eta_minutes)}</span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/restaurant/${restaurant.id}`}>
            <h4 className="font-heading font-bold text-foreground text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
              {restaurant.name}
            </h4>
          </Link>

          <p className="text-muted-foreground text-xs line-clamp-1 mt-1">
            {restaurant.address || 'Chưa cập nhật địa chỉ'}
          </p>
        </div>

        {/* Bottom meta & action */}
        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 text-foreground/80 font-medium text-xs">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span>{formatDistanceDisplay(restaurant.distance_km)}</span>
          </div>

          {showOrderAgainButton ? (
            <button
              type="button"
              onClick={() => onOrderAgain && onOrderAgain(restaurant)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/12 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs transition-colors cursor-pointer active:scale-95 border border-primary/25"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          ) : (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {restaurant.categories?.[0]?.name || 'Ẩm thực'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
