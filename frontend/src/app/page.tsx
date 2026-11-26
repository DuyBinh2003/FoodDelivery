'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Zap, Tag, Star, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HeroSection } from '@/features/home/components/hero-section/hero-section';
import { CategoryStrip } from '@/features/home/components/category-strip/category-strip';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { RestaurantFeedSection } from '@/features/home/components/restaurant-feed-section';
import { FeaturedDishesSection } from '@/features/home/components/featured-dishes-section';
import { AllRestaurantsInfinite } from '@/features/home/components/all-restaurants-infinite';
import { NotificationDrawer } from '@/features/home/components/notification-drawer';
import { LocationModal } from '@/features/home/components/location-modal';
import { BottomNavigationBar } from '@/features/home/components/bottom-navigation-bar';
import { CustomerLayout } from '@/components/layout/customer-layout/customer-layout';
import {
  BannerSkeleton,
  CategoryGridSkeleton,
  RestaurantFeedSkeleton,
  RestaurantGridSkeleton,
} from '@/features/home/components/home-skeletons';
import { useLocationStore } from '@/features/home/store/useLocationStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { getUserAddresses } from '@/features/address/api/address-api';
import { getOrderHistory } from '@/features/orders/api/order-api';
import { apiClient } from '@/lib/api-client';
import type { Order } from '@/features/orders/types';
import {
  dedupeById,
  enrichRestaurantsWithLocation,
  filterNearYouRestaurants,
  filterPromoRestaurants,
  filterTopRatedRestaurants,
  type EnrichedRestaurantItem,
  type FeaturedDishItem,
  type HomeCategoryItem,
  type HomeRestaurantItem,
  type PaginatedFeaturedDishesResponse,
  type PaginatedRestaurantsResponse,
  type PaginationMeta,
} from '@/features/home/utils/home-feed.utils';

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
  hasMore: false,
};

export default function HomePage() {
  const router = useRouter();
  const tHome = useTranslations('home');
  const { currentLocation, syncUserAddresses } = useLocationStore();
  const { isAuthenticated } = useAuthStore();
  const { addItem, clearCart } = useCartStore();

  const [categories, setCategories] = useState<HomeCategoryItem[]>([]);
  const [gridRestaurants, setGridRestaurants] = useState<HomeRestaurantItem[]>([]);
  const [gridPagination, setGridPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [promoPool, setPromoPool] = useState<HomeRestaurantItem[]>([]);
  const [topRatedPool, setTopRatedPool] = useState<HomeRestaurantItem[]>([]);
  const [featuredDishes, setFeaturedDishes] = useState<FeaturedDishItem[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [totalAllRestaurants, setTotalAllRestaurants] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // 1. Initial Homepage Discovery Boot (Paginated — never dumps all 150-500 rows at once)
  useEffect(() => {
    let isMounted = true;

    const fetchInitialHomeData = async () => {
      try {
        setLoading(true);

        const categoriesPromise = apiClient<HomeCategoryItem[]>('/restaurants/categories').catch(
          (err: unknown) => {
            console.warn('[HomePage] Failed to fetch categories:', err);
            return [];
          },
        );

        const gridPromise = apiClient<PaginatedRestaurantsResponse>('/restaurants/paginated', {
          params: { page: '1', limit: '8' },
        }).catch((err: unknown) => {
          console.warn('[HomePage] Failed to fetch paginated restaurants:', err);
          return { items: [], pagination: EMPTY_PAGINATION };
        });

        const promoPromise = apiClient<PaginatedRestaurantsResponse>('/restaurants/paginated', {
          params: { page: '1', limit: '12', promoOnly: 'true', sortBy: 'discount' },
        }).catch((err: unknown) => {
          console.warn('[HomePage] Failed to fetch promo restaurants:', err);
          return { items: [], pagination: EMPTY_PAGINATION };
        });

        const topRatedPromise = apiClient<PaginatedRestaurantsResponse>('/restaurants/paginated', {
          params: { page: '1', limit: '16', sortBy: 'rating' },
        }).catch((err: unknown) => {
          console.warn('[HomePage] Failed to fetch top-rated restaurants:', err);
          return { items: [], pagination: EMPTY_PAGINATION };
        });

        const featuredDishesPromise = apiClient<PaginatedFeaturedDishesResponse>(
          '/restaurants/featured-dishes',
          { params: { page: '1', limit: '8' } },
        ).catch((err: unknown) => {
          console.warn('[HomePage] Failed to fetch featured dishes:', err);
          return { items: [], pagination: EMPTY_PAGINATION };
        });

        const addressesPromise = isAuthenticated
          ? getUserAddresses().catch((err: unknown) => {
              console.warn('[HomePage] Failed to fetch user addresses:', err);
              return [];
            })
          : Promise.resolve([]);

        const ordersPromise = isAuthenticated
          ? getOrderHistory().catch((err: unknown) => {
              console.warn('[HomePage] Failed to fetch order history:', err);
              return [];
            })
          : Promise.resolve([]);

        const [
          categoriesRes,
          gridRes,
          promoRes,
          topRatedRes,
          featuredDishesRes,
          addressesRes,
          ordersRes,
        ] = await Promise.all([
          categoriesPromise,
          gridPromise,
          promoPromise,
          topRatedPromise,
          featuredDishesPromise,
          addressesPromise,
          ordersPromise,
        ]);

        if (!isMounted) return;

        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
        setGridRestaurants(gridRes.items || []);
        setGridPagination(gridRes.pagination || EMPTY_PAGINATION);
        setTotalAllRestaurants(gridRes.pagination?.total || gridRes.items?.length || 0);
        setPromoPool(promoRes.items || []);
        setTopRatedPool(topRatedRes.items || []);
        setFeaturedDishes(featuredDishesRes.items || []);

        if (addressesRes && addressesRes.length > 0) {
          syncUserAddresses(addressesRes);
        }

        if (ordersRes && Array.isArray(ordersRes)) {
          setPastOrders(ordersRes);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchInitialHomeData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, syncUserAddresses]);

  const handleSelectCategory = useCallback(async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCategoryLoading(true);

    const catParam = categoryId !== 'ALL' ? categoryId : undefined;
    try {
      const [gridRes, dishesRes] = await Promise.all([
        apiClient<PaginatedRestaurantsResponse>('/restaurants/paginated', {
          params: { page: '1', limit: '8', categoryId: catParam },
        }),
        apiClient<PaginatedFeaturedDishesResponse>('/restaurants/featured-dishes', {
          params: { page: '1', limit: '8', categoryId: catParam },
        }),
      ]);
      setGridRestaurants(gridRes.items || []);
      setGridPagination(gridRes.pagination || EMPTY_PAGINATION);
      setFeaturedDishes(dishesRes.items || []);
    } catch (error: unknown) {
      console.error('[HomePage] Failed to filter category:', error);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'ALL') return 'Tất cả';
    return categories.find((c) => c.id === selectedCategory)?.name ?? selectedCategory;
  }, [categories, selectedCategory]);

  const enrichedGridPage1 = useMemo(
    () => enrichRestaurantsWithLocation(gridRestaurants, currentLocation.lat, currentLocation.lng),
    [gridRestaurants, currentLocation.lat, currentLocation.lng],
  );

  const enrichedDiscoveryPool = useMemo(() => {
    const merged = dedupeById(
      dedupeById(gridRestaurants, topRatedPool),
      promoPool,
    );
    return enrichRestaurantsWithLocation(merged, currentLocation.lat, currentLocation.lng);
  }, [gridRestaurants, topRatedPool, promoPool, currentLocation.lat, currentLocation.lng]);

  const nearYouRestaurants = useMemo(
    () => filterNearYouRestaurants(enrichedDiscoveryPool, 3.5, 25),
    [enrichedDiscoveryPool],
  );

  const promoRestaurants = useMemo(() => {
    const enrichedPromo = enrichRestaurantsWithLocation(
      promoPool,
      currentLocation.lat,
      currentLocation.lng,
    );
    return filterPromoRestaurants(enrichedPromo);
  }, [promoPool, currentLocation.lat, currentLocation.lng]);

  const topRatedRestaurants = useMemo(() => {
    const enrichedTop = enrichRestaurantsWithLocation(
      topRatedPool,
      currentLocation.lat,
      currentLocation.lng,
    );
    return filterTopRatedRestaurants(enrichedTop, 4.5);
  }, [topRatedPool, currentLocation.lat, currentLocation.lng]);

  const orderAgainRestaurants = useMemo(() => {
    if (!isAuthenticated || pastOrders.length === 0) return [];
    const orderedRestaurantIds = new Set(
      pastOrders.map((o) => o.restaurant_id).filter(Boolean),
    );
    return enrichedDiscoveryPool.filter((r) => orderedRestaurantIds.has(r.id));
  }, [isAuthenticated, pastOrders, enrichedDiscoveryPool]);

  const activeOrder = useMemo(() => {
    return pastOrders.find(
      (o) =>
        o.status === 'ACCEPTED' ||
        o.status === 'COOKING' ||
        o.status === 'READY_FOR_PICKUP' ||
        o.status === 'DELIVERING',
    );
  }, [pastOrders]);

  const handleOrderAgain = useCallback(
    (restaurant: EnrichedRestaurantItem) => {
      const pastOrder = pastOrders.find((o) => o.restaurant_id === restaurant.id);
      if (pastOrder && pastOrder.items && pastOrder.items.length > 0) {
        clearCart();
        pastOrder.items.forEach((item) => {
          addItem(
            {
              id: item.menu_item_id || item.id,
              item_id: item.menu_item_id || item.id,
              name: item.name || 'Món ăn',
              price: Number(item.unit_price || 0),
              quantity: item.quantity || 1,
              options: item.options || [],
            },
            restaurant.id,
          );
        });
        router.push('/checkout');
      } else {
        router.push(`/restaurant/${restaurant.id}`);
      }
    },
    [pastOrders, clearCart, addItem, router],
  );

  return (
    <CustomerLayout>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-24 md:pb-14">
        {/* Hero Section */}
        <HeroSection
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
          totalRestaurantsCount={totalAllRestaurants}
        />

        {loading ? (
          <div className="space-y-8">
            <CategoryGridSkeleton />
            <BannerSkeleton />
            <RestaurantFeedSkeleton title="Gần bạn nhất" />
            <RestaurantFeedSkeleton title="Đang có khuyến mãi" />
            <RestaurantGridSkeleton />
          </div>
        ) : (
          <>
            {/* Horizontal Category Pill Strip synced with DB */}
            <CategoryStrip
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={(id) => void handleSelectCategory(id)}
            />

            {/* Promo Banner Carousel */}
            <BannerCarousel />

            {/* In-place Category Active Filter Banner */}
            {selectedCategory !== 'ALL' && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/8 border border-primary/25">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Đang lọc theo danh mục:{' '}
                    <strong className="text-primary">{selectedCategoryName}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSelectCategory('ALL')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* 1. Món Ngon Đang Hot (Featured Dishes Section on Homepage) */}
            <FeaturedDishesSection
              dishes={featuredDishes}
              selectedCategoryId={selectedCategory}
              selectedCategoryName={selectedCategoryName}
              loading={categoryLoading}
            />

            {/* 2. Đặt Lại Lần Nữa */}
            {orderAgainRestaurants.length > 0 && (
              <RestaurantFeedSection
                title={tHome('orderAgainTitle')}
                subtitle={tHome('orderAgainSubtitle')}
                icon={RotateCcw}
                badge="QUÁN QUEN"
                restaurants={orderAgainRestaurants}
                showOrderAgainButton={true}
                onOrderAgain={handleOrderAgain}
              />
            )}

            {/* 3. Gần Bạn Nhất */}
            <RestaurantFeedSection
              title={tHome('nearYouTitle')}
              subtitle={tHome('nearYouSubtitle')}
              icon={Zap}
              badge="GIAO NHANH"
              restaurants={nearYouRestaurants}
              viewAllHref="/menu?sort=distance"
            />

            {/* 4. Đang Có Khuyến Mãi */}
            <RestaurantFeedSection
              title={tHome('promoTitle')}
              subtitle={tHome('promoSubtitle')}
              icon={Tag}
              badge="HOT PROMO"
              restaurants={promoRestaurants}
              viewAllHref="/menu?promo=discount"
            />

            {/* 5. Quán Ngon Nổi Bật */}
            <RestaurantFeedSection
              title={tHome('topRatedTitle')}
              subtitle={tHome('topRatedSubtitle')}
              icon={Star}
              badge="TOP RATED"
              restaurants={topRatedRestaurants}
              viewAllHref="/menu?sort=rating"
            />

            {/* 6. Quán Ngon Đề Xuất (Giới hạn tối đa 8 quán trên Trang Chủ + CTA sang /menu, không tự tải trang khi scroll) */}
            <AllRestaurantsInfinite
              initialRestaurants={enrichedGridPage1}
              initialPagination={gridPagination}
              selectedCategoryId={selectedCategory}
              selectedCategoryName={selectedCategoryName}
              initialLoading={categoryLoading}
              previewLimit={8}
            />
          </>
        )}
      </main>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      <BottomNavigationBar
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        hasUnreadNotifications={true}
        activeOrderId={activeOrder?.id || null}
      />
    </CustomerLayout>
  );
}
