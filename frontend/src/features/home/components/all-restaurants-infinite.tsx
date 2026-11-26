'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Store, Loader2, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { MotionList } from '@/components/ui/motion-list/motion-list';
import { MotionListItem } from '@/components/ui/motion-list/motion-list-item';
import { apiClient } from '@/lib/api-client';
import {
  dedupeById,
  enrichRestaurantsWithLocation,
  type EnrichedRestaurantItem,
  type PaginatedRestaurantsResponse,
  type PaginationMeta,
} from '@/features/home/utils/home-feed.utils';
import { RestaurantCard } from '@/features/home/components/restaurant-card';
import { RestaurantGridSkeleton } from '@/features/home/components/home-skeletons';

interface AllRestaurantsInfiniteProps {
  initialRestaurants: EnrichedRestaurantItem[];
  initialPagination: PaginationMeta;
  selectedCategoryId: string;
  selectedCategoryName?: string;
  userLat?: number | null;
  userLng?: number | null;
  initialLoading?: boolean;
}

export function AllRestaurantsInfinite({
  initialRestaurants,
  initialPagination,
  selectedCategoryId,
  selectedCategoryName,
  userLat,
  userLng,
  initialLoading = false,
}: AllRestaurantsInfiniteProps) {
  const [restaurants, setRestaurants] = useState<EnrichedRestaurantItem[]>(initialRestaurants);
  const [pagination, setPagination] = useState<PaginationMeta>(initialPagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prevSync, setPrevSync] = useState({ initialRestaurants, initialPagination, selectedCategoryId });

  if (
    prevSync.initialRestaurants !== initialRestaurants ||
    prevSync.initialPagination !== initialPagination ||
    prevSync.selectedCategoryId !== selectedCategoryId
  ) {
    setPrevSync({ initialRestaurants, initialPagination, selectedCategoryId });
    setRestaurants(initialRestaurants);
    setPagination(initialPagination);
    setIsLoadingMore(false);
    setLoadError(null);
  }

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const refToCleanup = abortControllerRef;
    return () => {
      refToCleanup.current?.abort();
      isFetchingRef.current = false;
    };
  }, [selectedCategoryId, initialRestaurants]);

  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || !pagination.hasMore) return;

    const nextPage = pagination.page + 1;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setLoadError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await apiClient<PaginatedRestaurantsResponse>('/restaurants/paginated', {
        params: {
          page: String(nextPage),
          limit: String(pagination.limit || 12),
          categoryId:
            selectedCategoryId && selectedCategoryId !== 'ALL' ? selectedCategoryId : undefined,
        },
        signal: controller.signal,
      });

      const enrichedBatch = enrichRestaurantsWithLocation(
        response.items || [],
        userLat,
        userLng,
      );

      setRestaurants((prev) => dedupeById(prev, enrichedBatch));
      setPagination(response.pagination);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('[AllRestaurantsInfinite] Failed to fetch next page:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể tải thêm nhà hàng. Vui lòng thử lại.';
      setLoadError(message);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [pagination.hasMore, pagination.limit, pagination.page, selectedCategoryId, userLat, userLng]);

  useEffect(() => {
    if (!pagination.hasMore || isLoadingMore || loadError || initialLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextPage();
        }
      },
      { rootMargin: '240px' },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [pagination.hasMore, isLoadingMore, loadError, initialLoading, loadNextPage]);

  const displayTotal = Math.max(pagination.total, restaurants.length);

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
            selectedCategoryId !== 'ALL' &&
            selectedCategoryName !== 'Tất cả'
              ? `Khám Phá Quán: ${selectedCategoryName}`
              : 'Khám Phá Tất Cả Quán Ngon'}
          </h3>
          <span className="text-xs text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-secondary">
            {displayTotal} quán
          </span>
        </div>
      </div>

      {/* Grid */}
      {initialLoading ? (
        <RestaurantGridSkeleton />
      ) : restaurants.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-border space-y-2 shadow-xs">
          <p className="text-foreground font-bold">Không tìm thấy quán ăn nào phù hợp</p>
          <p className="text-xs text-muted-foreground">
            Hãy thử chọn danh mục khác hoặc mở rộng khu vực tìm kiếm
          </p>
        </div>
      ) : (
        <MotionList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {restaurants.map((restaurant) => (
            <MotionListItem key={restaurant.id}>
              <RestaurantCard restaurant={restaurant} layout="grid" />
            </MotionListItem>
          ))}
        </MotionList>
      )}

      {/* Infinite Scroll Sentinel / Error Retry / End Indicator */}
      <div ref={sentinelRef} className="py-6 text-center">
        {loadError ? (
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-5 py-3 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadNextPage()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-white font-semibold hover:opacity-90 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : isLoadingMore ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-muted-foreground text-xs font-medium shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>
                Đang tải thêm quán ngon ({restaurants.length}/{displayTotal})...
              </span>
            </div>
          </div>
        ) : !pagination.hasMore && restaurants.length > 0 ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>
              Bạn đã xem hết {displayTotal} quán trong khu vực
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
