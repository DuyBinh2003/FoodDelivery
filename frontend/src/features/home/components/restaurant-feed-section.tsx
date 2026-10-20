'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import type { EnrichedRestaurantItem } from '../utils/home-feed.utils';
import { RestaurantCard } from './restaurant-card';

interface RestaurantFeedSectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  viewAllHref?: string;
  restaurants: EnrichedRestaurantItem[];
  showOrderAgainButton?: boolean;
  onOrderAgain?: (restaurant: EnrichedRestaurantItem) => void;
}

export function RestaurantFeedSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  viewAllHref,
  restaurants,
  showOrderAgainButton = false,
  onOrderAgain,
}: RestaurantFeedSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!restaurants || restaurants.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -320 : 320;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {title}
            </h3>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-zinc-400">{subtitle}</p>}
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors mr-2 hidden sm:inline"
            >
              Xem tất cả ({restaurants.length})
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Cuộn sang trái"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Cuộn sang phải"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll List */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar scroll-smooth"
      >
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            showOrderAgainButton={showOrderAgainButton}
            onOrderAgain={onOrderAgain}
          />
        ))}
      </div>
    </section>
  );
}
