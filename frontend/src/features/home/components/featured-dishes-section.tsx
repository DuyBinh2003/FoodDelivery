'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ChevronRight } from 'lucide-react';
import FoodCard from '@/features/menu/components/food-card/food-card';
import type { FeaturedDishItem } from '@/features/home/utils/home-feed.utils';

interface FeaturedDishesSectionProps {
  dishes: FeaturedDishItem[];
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  loading?: boolean;
}

export function FeaturedDishesSection({
  dishes,
  selectedCategoryId,
  selectedCategoryName,
  loading = false,
}: FeaturedDishesSectionProps) {
  if (!loading && (!dishes || dishes.length === 0)) {
    return null;
  }

  const viewAllHref =
    selectedCategoryId && selectedCategoryId !== 'ALL'
      ? `/menu?category=${encodeURIComponent(selectedCategoryId)}`
      : '/menu';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/12 text-amber-500 border border-amber-500/25 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading text-lg sm:text-xl font-extrabold text-foreground tracking-tight truncate">
                {selectedCategoryName && selectedCategoryId !== 'ALL'
                  ? `Món Ngon Nổi Bật • ${selectedCategoryName}`
                  : 'Món Ngon Đang Hot'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[10px] font-extrabold uppercase tracking-wider">
                HOT DISHES
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              Ưu đãi trực tiếp, hình ảnh thật và tùy chọn món đa dạng từ các quán hàng đầu
            </p>
          </div>
        </div>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
        >
          <span>Xem thực đơn</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 animate-pulse">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-72 rounded-2xl bg-card border border-border"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {dishes.map((dish, idx) => (
            <FoodCard key={dish.id} item={dish} index={idx} mode="menu" />
          ))}
        </div>
      )}
    </section>
  );
}
