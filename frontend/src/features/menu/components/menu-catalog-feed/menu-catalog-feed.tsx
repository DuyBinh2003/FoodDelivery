'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, RefreshCw, AlertCircle, RotateCcw, SearchX } from 'lucide-react';
import { getPaginatedMenuItems } from '@/features/search/api/search-api';
import { MenuToolbar } from '@/features/search/components/MenuToolbar';
import { CircuitBreakerDegradationBanner } from '@/features/search/components/CircuitBreakerDegradationBanner';
import FoodList from '@/features/menu/components/food-list/food-list';
import { useLocationStore } from '@/features/home/store/useLocationStore';
import type {
  MenuPaginationMeta,
  MenuSection,
  PaginatedMenuResponse,
} from '@/features/search/types';
import {
  mergePaginatedMenuSections,
  sortMenuSectionItems,
} from '@/features/search/utils/menu-catalog.utils';

interface MenuCatalogFeedProps {
  initialResult: PaginatedMenuResponse;
  filterKey: string;
  queryParams: {
    q?: string;
    category?: string;
    tag?: string;
    promo?: string;
    sort?: string;
    radius?: string;
    open_only?: boolean;
  };
}

export function MenuCatalogFeed({
  initialResult,
  filterKey,
  queryParams,
}: MenuCatalogFeedProps) {
  const { currentLocation } = useLocationStore();

  const [sections, setSections] = useState<MenuSection[]>(initialResult.sections);
  const [pagination, setPagination] = useState<MenuPaginationMeta>(initialResult.pagination);
  const [isFallback, setIsFallback] = useState<boolean>(initialResult.isFallback);
  const [circuitStatus, setCircuitStatus] = useState<string>(initialResult.circuitStatus);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prevSync, setPrevSync] = useState({ initialResult, filterKey });

  if (prevSync.initialResult !== initialResult || prevSync.filterKey !== filterKey) {
    setPrevSync({ initialResult, filterKey });
    setSections(initialResult.sections);
    setPagination(initialResult.pagination);
    setIsFallback(initialResult.isFallback);
    setCircuitStatus(initialResult.circuitStatus);
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
  }, [filterKey, initialResult]);

  const sortByParam = useMemo(() => {
    if (queryParams.sort === 'distance') return 'distance' as const;
    if (queryParams.sort === 'rating') return 'rating' as const;
    return undefined;
  }, [queryParams.sort]);

  const handleRetryInitial = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoadError(null);

    try {
      const fresh = await getPaginatedMenuItems(
        {
          q: queryParams.q,
          category: queryParams.category,
          tag: queryParams.tag,
          promo: queryParams.promo,
          radius: queryParams.radius,
          open_only: queryParams.open_only,
          sort_by: sortByParam,
          lat: currentLocation.lat,
          lon: currentLocation.lng,
          page: 1,
          limit: pagination.limit || 8,
        },
        controller.signal,
      );
      setSections(fresh.sections);
      setPagination(fresh.pagination);
      setIsFallback(fresh.isFallback);
      setCircuitStatus(fresh.circuitStatus);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[MenuCatalogFeed] Failed to refresh initial menu catalog:', error);
      setLoadError(
        error instanceof Error ? error.message : 'Không thể tải lại thực đơn. Vui lòng thử lại.',
      );
    }
  }, [
    currentLocation.lat,
    currentLocation.lng,
    pagination.limit,
    queryParams.category,
    queryParams.open_only,
    queryParams.promo,
    queryParams.q,
    queryParams.radius,
    queryParams.tag,
    sortByParam,
  ]);

  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || !pagination.hasMore) return;

    const nextPage = pagination.page + 1;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setLoadError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const nextResult = await getPaginatedMenuItems(
        {
          q: queryParams.q,
          category: queryParams.category,
          tag: queryParams.tag,
          promo: queryParams.promo,
          radius: queryParams.radius,
          open_only: queryParams.open_only,
          sort_by: sortByParam,
          lat: currentLocation.lat,
          lon: currentLocation.lng,
          page: nextPage,
          limit: pagination.limit || 8,
        },
        controller.signal,
      );

      setSections((prev) => mergePaginatedMenuSections(prev, nextResult.sections));
      setPagination(nextResult.pagination);
      if (nextResult.isFallback) {
        setIsFallback(true);
        setCircuitStatus(nextResult.circuitStatus);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[MenuCatalogFeed] Failed to load next menu page:', error);
      setLoadError(
        error instanceof Error && error.message
          ? error.message
          : 'Không thể tải thêm món ăn. Vui lòng thử lại.',
      );
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    currentLocation.lat,
    currentLocation.lng,
    pagination.hasMore,
    pagination.limit,
    pagination.page,
    queryParams.category,
    queryParams.open_only,
    queryParams.promo,
    queryParams.q,
    queryParams.radius,
    queryParams.tag,
    sortByParam,
  ]);

  useEffect(() => {
    if (!pagination.hasMore || isLoadingMore || loadError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextPage();
        }
      },
      { rootMargin: '260px' },
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [pagination.hasMore, isLoadingMore, loadError, loadNextPage]);

  const sortedSections = useMemo(
    () => sortMenuSectionItems(sections, queryParams.sort),
    [sections, queryParams.sort],
  );

  const loadedItemsCount = useMemo(
    () => sortedSections.reduce((sum, sec) => sum + sec.items.length, 0),
    [sortedSections],
  );
  const displayTotalDishes = Math.max(pagination.totalDishes, loadedItemsCount);
  const displayTotalRestaurants = Math.max(pagination.totalRestaurants, sortedSections.length);

  return (
    <div className="space-y-8">
      <CircuitBreakerDegradationBanner
        isFallback={isFallback}
        circuitStatus={circuitStatus}
        onRetry={handleRetryInitial}
      />

      {sortedSections.length === 0 ? (
        <div className="py-20 px-4 text-center max-w-md mx-auto flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-5 shadow-sm">
            <SearchX className="w-10 h-10" />
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">
            Không tìm thấy món ăn nào
          </h3>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Rất tiếc, chúng tôi không tìm thấy kết quả phù hợp với tiêu chí tìm kiếm của bạn. Hãy thử đổi từ khóa hoặc khám phá lại toàn bộ menu.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-semibold text-sm shadow-sm transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            Khám phá lại thực đơn
          </Link>
        </div>
      ) : (
        <>
          <MenuToolbar
            totalItems={displayTotalDishes}
            totalRestaurants={displayTotalRestaurants}
          />

          <div className="space-y-10">
            {sortedSections.map((section, sectionIdx) => (
              <FoodList
                key={section.restaurant_id || `${section.restaurant}-${sectionIdx}`}
                items={section.items}
                restaurantName={section.restaurant}
                restaurantId={section.restaurant_id}
                restaurantBannerUrl={section.restaurant_banner_url}
                restaurantRating={section.restaurant_rating}
                restaurantTotalReviews={section.restaurant_total_reviews}
                restaurantAddress={section.restaurant_address}
                distanceKm={section.distance_km}
                prioritizeFirstItems={sectionIdx === 0 ? 4 : 0}
              />
            ))}
          </div>

          {/* Infinite Lazy Load Sentinel / Retry / End Indicator */}
          <div ref={sentinelRef} className="py-8 text-center">
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
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-xs font-medium shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>
                  Đang tải thêm thực đơn ({sortedSections.length}/{displayTotalRestaurants} quán)...
                </span>
              </div>
            ) : !pagination.hasMore ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>
                  Đã hiển thị toàn bộ {loadedItemsCount} món từ {sortedSections.length} quán ăn
                </span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
