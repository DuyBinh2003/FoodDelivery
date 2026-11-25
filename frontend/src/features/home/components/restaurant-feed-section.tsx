'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    const amount = direction === 'left' ? -340 : 340;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {Icon && (
              <div className="p-2 rounded-xl bg-primary/12 text-primary border border-primary/20">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {title}
            </h3>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/12 border border-primary/25 text-primary text-[11px] font-bold uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-2 shrink-0">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs sm:text-sm font-bold text-primary hover:underline transition-colors mr-1 hidden sm:inline"
            >
              Xem tất cả ({restaurants.length})
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Cuộn sang trái"
              className="p-2 rounded-xl bg-card hover:bg-secondary text-foreground border border-border transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Cuộn sang phải"
              className="p-2 rounded-xl bg-card hover:bg-secondary text-foreground border border-border transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll List */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar scroll-smooth"
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
    </motion.section>
  );
}
