'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Zap, Tag, Star, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HeroSection } from '@/features/home/components/hero-section/hero-section';
import { CategoryStrip } from '@/features/home/components/category-strip/category-strip';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { RestaurantFeedSection } from '@/features/home/components/restaurant-feed-section';
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
  enrichRestaurantsWithLocation,
  filterNearYouRestaurants,
  filterPromoRestaurants,
  filterTopRatedRestaurants,
  filterRestaurantsByCategory,
  type HomeRestaurantItem,
  type EnrichedRestaurantItem,
} from '@/features/home/utils/home-feed.utils';

export default function HomePage() {
  const router = useRouter();
  const tHome = useTranslations('home');
  const { currentLocation, syncUserAddresses } = useLocationStore();
  const { isAuthenticated } = useAuthStore();
  const { addItem, clearCart } = useCartStore();

  const [restaurants, setRestaurants] = useState<HomeRestaurantItem[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchHomeData = async () => {
      try {
        setLoading(true);

        const restaurantsPromise = apiClient<HomeRestaurantItem[]>('/restaurants').catch((err) => {
          console.warn('[HomePage] Failed to fetch restaurants:', err);
          return [];
        });

        const addressesPromise = isAuthenticated
          ? getUserAddresses().catch((err) => {
              console.warn('[HomePage] Failed to fetch user addresses:', err);
              return [];
            })
          : Promise.resolve([]);

        const ordersPromise = isAuthenticated
          ? getOrderHistory().catch((err) => {
              console.warn('[HomePage] Failed to fetch order history:', err);
              return [];
            })
          : Promise.resolve([]);

        const [restaurantsRes, addressesRes, ordersRes] = await Promise.all([
          restaurantsPromise,
          addressesPromise,
          ordersPromise,
        ]);

        if (!isMounted) return;

        setRestaurants(restaurantsRes || []);

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

    fetchHomeData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, syncUserAddresses]);

  const enrichedRestaurants = useMemo(() => {
    return enrichRestaurantsWithLocation(
      restaurants,
      currentLocation.lat,
      currentLocation.lng,
    );
  }, [restaurants, currentLocation.lat, currentLocation.lng]);

  const nearYouRestaurants = useMemo(() => {
    return filterNearYouRestaurants(enrichedRestaurants, 3.5, 25);
  }, [enrichedRestaurants]);

  const promoRestaurants = useMemo(() => {
    return filterPromoRestaurants(enrichedRestaurants);
  }, [enrichedRestaurants]);

  const topRatedRestaurants = useMemo(() => {
    return filterTopRatedRestaurants(enrichedRestaurants, 4.5);
  }, [enrichedRestaurants]);

  const categoryFilteredRestaurants = useMemo(() => {
    return filterRestaurantsByCategory(enrichedRestaurants, selectedCategory);
  }, [enrichedRestaurants, selectedCategory]);

  const orderAgainRestaurants = useMemo(() => {
    if (!isAuthenticated || pastOrders.length === 0) return [];

    const orderedRestaurantIds = new Set(
      pastOrders.map((o) => o.restaurant_id).filter(Boolean),
    );

    return enrichedRestaurants.filter((r) => orderedRestaurantIds.has(r.id));
  }, [isAuthenticated, pastOrders, enrichedRestaurants]);

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
          totalRestaurantsCount={restaurants.length}
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
            {/* Horizontal Category Pill Strip */}
            <CategoryStrip
              selectedCategoryId={selectedCategory}
              onSelectCategory={(id) => setSelectedCategory(id)}
            />

            {/* Promo Banner Carousel */}
            <BannerCarousel />

            {/* In-place Category Active Filter Banner */}
            {selectedCategory !== 'ALL' && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/8 border border-primary/25">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Đang lọc món theo danh mục:{' '}
                    <strong className="text-primary uppercase">{selectedCategory}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* 1. Đặt Lại Lần Nữa */}
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

            {/* 2. Gần Bạn Nhất */}
            <RestaurantFeedSection
              title={tHome('nearYouTitle')}
              subtitle={tHome('nearYouSubtitle')}
              icon={Zap}
              badge="GIAO NHANH"
              restaurants={nearYouRestaurants}
              viewAllHref="/menu?sort=distance"
            />

            {/* 3. Đang Có Khuyến Mãi */}
            <RestaurantFeedSection
              title={tHome('promoTitle')}
              subtitle={tHome('promoSubtitle')}
              icon={Tag}
              badge="HOT PROMO"
              restaurants={promoRestaurants}
              viewAllHref="/menu?promo=true"
            />

            {/* 4. Quán Ngon Nổi Bật */}
            <RestaurantFeedSection
              title={tHome('topRatedTitle')}
              subtitle={tHome('topRatedSubtitle')}
              icon={Star}
              badge="TOP RATED"
              restaurants={topRatedRestaurants}
              viewAllHref="/menu?sort=rating"
            />

            {/* 5. Tất Cả Quán Ngon (Infinite Scroll Grid) */}
            <AllRestaurantsInfinite
              restaurants={categoryFilteredRestaurants}
              selectedCategoryName={selectedCategory}
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
