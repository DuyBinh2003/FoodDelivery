'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, Loader2, CheckCircle2 } from 'lucide-react';
import { MotionList } from '@/components/ui/motion-list/motion-list';
import { MotionListItem } from '@/components/ui/motion-list/motion-list-item';
import type { EnrichedRestaurantItem } from '../utils/home-feed.utils';
import { RestaurantCard } from './restaurant-card';

interface AllRestaurantsInfiniteProps {
  restaurants: EnrichedRestaurantItem[];
  selectedCategoryName?: string;
  pageSize?: number;
}

export function AllRestaurantsInfinite({
  restaurants,
  selectedCategoryName,
  pageSize = 8,
}: AllRestaurantsInfiniteProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [prevRestaurants, setPrevRestaurants] = useState(restaurants);

  if (restaurants !== prevRestaurants) {
    setPrevRestaurants(restaurants);
    setVisibleCount(pageSize);
  }

  const hasMore = visibleCount < restaurants.length;

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + pageSize, restaurants.length));
            setIsLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: '200px' },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [hasMore, isLoadingMore, pageSize, restaurants.length]);

  const visibleRestaurants = restaurants.slice(0, visibleCount);

  return (
    <section className="space-y-5 pt-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border pb-3.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-primary/12 text-primary border border-primary/20">
            <Store className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            {selectedCategoryName &&
              selectedCategoryName !== 'ALL' &&
              selectedCategoryName !== 'Tất cả'
              ? `Món ngon: ${selectedCategoryName}`
              : 'Khám Phá Tất Cả Quán Ngon'}
          </h3>
          <span className="text-xs text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-secondary">
            {restaurants.length} quán
          </span>
        </div>
      </div>

      {/* Grid */}
      {visibleRestaurants.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-border space-y-2 shadow-xs">
          <p className="text-foreground font-bold">Không tìm thấy quán ăn nào phù hợp</p>
          <p className="text-xs text-muted-foreground">
            Hãy thử mở rộng bán kính hoặc chọn địa chỉ giao hàng khác
          </p>
        </div>
      ) : (
        <MotionList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {visibleRestaurants.map((restaurant) => (
            <MotionListItem key={restaurant.id}>
              <RestaurantCard restaurant={restaurant} layout="grid" />
            </MotionListItem>
          ))}
        </MotionList>
      )}

      {/* Infinite Scroll Trigger & End Indicator */}
      <div ref={sentinelRef} className="py-6 text-center">
        {isLoadingMore ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-muted-foreground text-xs font-medium shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Đang tải thêm quán ngon...</span>
          </div>
        ) : !hasMore && visibleRestaurants.length > 0 ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Bạn đã xem hết {restaurants.length} quán trong khu vực</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
