'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, Loader2, CheckCircle2 } from 'lucide-react';
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

  // Điều chỉnh state khi danh sách nhà hàng thay đổi (theo tài liệu chuẩn của React)
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
          // Simulate short smooth delay
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + pageSize, restaurants.length));
            setIsLoadingMore(false);
          }, 400);
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
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
            <Store className="w-5 h-5" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {selectedCategoryName && selectedCategoryName !== 'Tất cả'
              ? `Món ngon: ${selectedCategoryName}`
              : 'Khám Phá Tất Cả Quán Ngon'}
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            ({restaurants.length} quán)
          </span>
        </div>
      </div>

      {/* Grid */}
      {visibleRestaurants.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-2">
          <p className="text-zinc-300 font-bold">Không tìm thấy quán ăn nào phù hợp</p>
          <p className="text-xs text-zinc-500">
            Hãy thử mở rộng bán kính hoặc chọn địa chỉ giao hàng khác
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {visibleRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              layout="grid"
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger & End Indicator */}
      <div ref={sentinelRef} className="py-6 text-center">
        {isLoadingMore ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Đang tải thêm quán ngon...</span>
          </div>
        ) : !hasMore && visibleRestaurants.length > 0 ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-zinc-500 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400/80" />
            <span>Bạn đã xem hết {restaurants.length} quán trong khu vực</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
