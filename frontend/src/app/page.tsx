'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Zap,
  Tag,
  Star,
  Sparkles,
} from 'lucide-react';
import { HomeHeader } from '@/features/home/components/home-header';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CategoryGrid } from '@/features/home/components/category-grid';
import { RestaurantFeedSection } from '@/features/home/components/restaurant-feed-section';
import { AllRestaurantsInfinite } from '@/features/home/components/all-restaurants-infinite';
import { NotificationDrawer } from '@/features/home/components/notification-drawer';
import { BottomNavigationBar } from '@/features/home/components/bottom-navigation-bar';
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
  const { currentLocation, syncUserAddresses } = useLocationStore();
  const { isAuthenticated } = useAuthStore();
  const { addItem, clearCart } = useCartStore();

  const [restaurants, setRestaurants] = useState<HomeRestaurantItem[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // 1. Tải danh sách nhà hàng và dữ liệu khởi tạo
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

  // 2. Tính toán khoảng cách (km) và ETA (phút) dựa trên tọa độ hiện tại
  const enrichedRestaurants = useMemo(() => {
    return enrichRestaurantsWithLocation(
      restaurants,
      currentLocation.lat,
      currentLocation.lng,
    );
  }, [restaurants, currentLocation.lat, currentLocation.lng]);

  // 3. Phân bổ các danh sách đề xuất (Feeds)
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

  // Lọc các quán người dùng đã từng đặt (Order Again)
  const orderAgainRestaurants = useMemo(() => {
    if (!isAuthenticated || pastOrders.length === 0) return [];

    const orderedRestaurantIds = new Set(
      pastOrders.map((o) => o.restaurant_id).filter(Boolean),
    );

    return enrichedRestaurants.filter((r) => orderedRestaurantIds.has(r.id));
  }, [isAuthenticated, pastOrders, enrichedRestaurants]);

  // Tìm đơn hàng đang hoạt động (active order) để hiển thị ping trên Bottom Nav
  const activeOrder = useMemo(() => {
    return pastOrders.find(
      (o) =>
        o.status === 'ACCEPTED' ||
        o.status === 'COOKING' ||
        o.status === 'READY_FOR_PICKUP' ||
        o.status === 'DELIVERING',
    );
  }, [pastOrders]);

  // Xử lý khi bấm nút "Đặt lại" trên đơn cũ
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
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      {/* 1. Header & Điều hướng trung tâm */}
      <HomeHeader
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        hasUnreadNotifications={true}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-28 md:pb-16">
        {loading ? (
          <div className="space-y-8">
            <BannerSkeleton />
            <CategoryGridSkeleton />
            <RestaurantFeedSkeleton title="Gần bạn nhất" />
            <RestaurantFeedSkeleton title="Đang có khuyến mãi" />
            <RestaurantGridSkeleton />
          </div>
        ) : (
          <>
            {/* 3. Banner Carousel */}
            <BannerCarousel />

            {/* 4. Food Categories Grid */}
            <CategoryGrid
              selectedCategoryId={selectedCategory}
              onSelectCategory={(id) => setSelectedCategory(id)}
            />

            {/* In-place Category Active Filter Banner */}
            {selectedCategory !== 'ALL' && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    Đang lọc món theo danh mục:{' '}
                    <strong className="text-amber-400 uppercase">{selectedCategory}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* 5. Khối 1: Đặt Lại Lần Nữa (Chỉ hiện khi đã đăng nhập & có đơn cũ) */}
            {orderAgainRestaurants.length > 0 && (
              <RestaurantFeedSection
                title="Đặt lại lần nữa"
                subtitle="Những quán quen và món ngon bạn đã từng thưởng thức"
                icon={RotateCcw}
                badge="QUÁN QUEN"
                restaurants={orderAgainRestaurants}
                showOrderAgainButton={true}
                onOrderAgain={handleOrderAgain}
              />
            )}

            {/* 6. Khối 2: Gần Bạn Nhất (Bán kính <= 3.5km, ETA <= 25 phút) */}
            <RestaurantFeedSection
              title="Gần bạn nhất"
              subtitle="Cự ly dưới 3.5km • Giao nhanh thần tốc trong 20 phút"
              icon={Zap}
              badge="GIAO NHANH"
              restaurants={nearYouRestaurants}
              viewAllHref="/menu?sort=distance"
            />

            {/* 7. Khối 3: Đang Có Khuyến Mãi (Freeship & Flash Sale) */}
            <RestaurantFeedSection
              title="Đang có khuyến mãi"
              subtitle="Freeship đơn từ 0Đ và ưu đãi độc quyền hôm nay"
              icon={Tag}
              badge="HOT PROMO"
              restaurants={promoRestaurants}
              viewAllHref="/menu?promo=true"
            />

            {/* 8. Khối 4: Quán Ngon Nổi Bật (Rating >= 4.5) */}
            <RestaurantFeedSection
              title="Quán ngon nổi bật"
              subtitle="Được cộng đồng ẩm thực đánh giá cao nhất từ 4.5 sao"
              icon={Star}
              badge="TOP RATED"
              restaurants={topRatedRestaurants}
              viewAllHref="/menu?sort=rating"
            />

            {/* 9. Khối Tổng Hợp: Infinite Scroll Grid */}
            <AllRestaurantsInfinite
              restaurants={categoryFilteredRestaurants}
              selectedCategoryName={selectedCategory}
            />
          </>
        )}
      </main>

      {/* 10. Drawer Thông Báo Khuyến Mãi & Trạng Thái Đơn */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      {/* 11. Thanh Điều Hướng Dưới Cùng (Mobile) */}
      <BottomNavigationBar
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        hasUnreadNotifications={true}
        activeOrderId={activeOrder?.id || null}
      />
    </div>
  );
}
