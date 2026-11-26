'use client';

import React from 'react';
import Link from 'next/link';
import { Store, ArrowRight } from 'lucide-react';
import { MotionList } from '@/components/ui/motion-list/motion-list';
import { MotionListItem } from '@/components/ui/motion-list/motion-list-item';
import type {
  EnrichedRestaurantItem,
  PaginationMeta,
} from '@/features/home/utils/home-feed.utils';
import { RestaurantCard } from '@/features/home/components/restaurant-card';
import { RestaurantGridSkeleton } from '@/features/home/components/home-skeletons';

interface AllRestaurantsInfiniteProps {
  initialRestaurants: EnrichedRestaurantItem[];
  initialPagination: PaginationMeta;
  selectedCategoryId: string;
  selectedCategoryName?: string;
  initialLoading?: boolean;
  previewLimit?: number;
}

export function AllRestaurantsInfinite({
  initialRestaurants,
  initialPagination,
  selectedCategoryId,
  selectedCategoryName,
  initialLoading = false,
  previewLimit = 8,
}: AllRestaurantsInfiniteProps) {
  const previewRestaurants = initialRestaurants.slice(0, previewLimit);
  const displayTotal = Math.max(initialPagination.total, previewRestaurants.length);
  const viewAllHref =
    selectedCategoryId && selectedCategoryId !== 'ALL'
      ? `/menu?category=${encodeURIComponent(selectedCategoryId)}`
      : '/menu';

  return (
    <section className="space-y-5 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3.5 gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-primary/12 text-primary border border-primary/20">
            <Store className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            {selectedCategoryName &&
            selectedCategoryId !== 'ALL' &&
            selectedCategoryName !== 'Tất cả'
              ? `Quán Ngon Đề Xuất: ${selectedCategoryName}`
              : 'Quán Ngon Đề Xuất'}
          </h3>
          {displayTotal > 0 && (
            <span className="text-xs text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-secondary">
              Hiển thị {previewRestaurants.length}/{displayTotal} quán
            </span>
          )}
        </div>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary hover:underline shrink-0"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Capped Grid Preview (No auto-loading on scroll) */}
      {initialLoading ? (
        <RestaurantGridSkeleton />
      ) : previewRestaurants.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-border space-y-2 shadow-xs">
          <p className="text-foreground font-bold">Không tìm thấy quán ăn nào phù hợp</p>
          <p className="text-xs text-muted-foreground">
            Hãy thử chọn danh mục khác hoặc khám phá thêm tại trang Thực đơn
          </p>
        </div>
      ) : (
        <MotionList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {previewRestaurants.map((restaurant) => (
            <MotionListItem key={restaurant.id}>
              <RestaurantCard restaurant={restaurant} layout="grid" />
            </MotionListItem>
          ))}
        </MotionList>
      )}

      {/* Explicit CTA to /menu instead of endless scrolling on Homepage */}
      {!initialLoading && previewRestaurants.length > 0 && (
        <div className="pt-2 flex justify-center">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/25 font-bold text-sm transition-all duration-200 shadow-xs active:scale-98"
          >
            <span>
              {displayTotal > previewRestaurants.length
                ? `Khám phá toàn bộ ${displayTotal} quán & thực đơn`
                : 'Khám phá chi tiết tại Thực đơn'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
