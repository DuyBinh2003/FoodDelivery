/**
 * @file home-feed.utils.ts
 * @description Pure utility functions for calculating restaurant distances, ETAs, and filtering personalized feeds.
 */
/**
 * Tính khoảng cách đường chim bay giữa 2 tọa độ GPS (WGS84) theo công thức Haversine.
 */
export function calculateDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined,
): number {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined ||
    Number.isNaN(Number(lat1)) ||
    Number.isNaN(Number(lon1)) ||
    Number.isNaN(Number(lat2)) ||
    Number.isNaN(Number(lon2))
  ) {
    return 0;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (nLat1 === nLat2 && nLon1 === nLon2) {
    return 0;
  }

  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

export interface HomeRestaurantItem {
  id: string;
  name: string;
  address?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  rating?: number | string | null;
  categories?: { id: string; name: string; icon_url?: string | null }[];
  tags?: string[];
  is_active?: boolean;
  image_url?: string | null;
  discount_label?: string | null;
  is_freeship?: boolean;
  order_count?: number;
}

export interface EnrichedRestaurantItem extends HomeRestaurantItem {
  distance_km: number;
  eta_minutes: number;
}

/**
 * Tính thời gian giao hàng dự kiến (ETA) dựa trên cự ly km:
 * - 10 phút chuẩn bị món ăn tại quán
 * - Tốc độ di chuyển trung bình trong đô thị 25 km/h (~2.4 phút/km)
 * - Tối thiểu 12 phút, tối đa 90 phút.
 */
export function calculateRestaurantEtaMinutes(distanceKm: number): number {
  if (isNaN(distanceKm) || distanceKm <= 0) {
    return 15;
  }
  const travelMinutes = (distanceKm / 25) * 60;
  return Math.min(90, Math.max(12, Math.round(10 + travelMinutes)));
}

/**
 * Bổ sung cự ly (km) và ETA (phút) cho từng nhà hàng dựa trên tọa độ người dùng.
 */
export function enrichRestaurantsWithLocation(
  restaurants: HomeRestaurantItem[],
  userLat: number | null | undefined,
  userLng: number | null | undefined,
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];

  return restaurants.map((restaurant) => {
    const restLat = restaurant.lat != null ? Number(restaurant.lat) : null;
    const restLon = restaurant.lon != null ? Number(restaurant.lon) : null;

    let distance_km = 0;
    if (userLat != null && userLng != null && restLat != null && restLon != null) {
      distance_km = calculateDistanceKm(userLat, userLng, restLat, restLon);
    }

    const eta_minutes = calculateRestaurantEtaMinutes(distance_km);

    return {
      ...restaurant,
      distance_km,
      eta_minutes,
    };
  });
}

/**
 * Khối 1: Lọc quán "Gần bạn nhất" (Near You / Fast Delivery)
 * - Bán kính <= maxRadiusKm (mặc định 3.0 km)
 * - ETA <= maxEtaMinutes (mặc định 25 phút)
 * - Sắp xếp theo cự ly tăng dần.
 */
export function filterNearYouRestaurants(
  restaurants: EnrichedRestaurantItem[],
  maxRadiusKm = 3.0,
  maxEtaMinutes = 25,
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];

  return restaurants
    .filter((r) => r.is_active !== false && r.distance_km > 0 && r.distance_km <= maxRadiusKm && r.eta_minutes <= maxEtaMinutes)
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Khối 2: Lọc quán "Đang có khuyến mãi" (Promo / Flash Sale)
 * - Quán có cờ freeship hoặc có nhãn giảm giá (discount_label)
 */
export function filterPromoRestaurants(
  restaurants: EnrichedRestaurantItem[],
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];

  return restaurants.filter(
    (r) => r.is_active !== false && (r.is_freeship === true || (typeof r.discount_label === 'string' && r.discount_label.trim().length > 0)),
  );
}

/**
 * Khối 3: Lọc quán "Quán ngon nổi bật" (Top Rated / Trending)
 * - Rating >= minRating (mặc định 4.5 sao)
 * - Sắp xếp theo rating giảm dần.
 */
export function filterTopRatedRestaurants(
  restaurants: EnrichedRestaurantItem[],
  minRating = 4.5,
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];

  return restaurants
    .filter((r) => r.is_active !== false && Number(r.rating || 0) >= minRating)
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
}

/**
 * Lọc quán ăn theo danh mục (Category filter).
 */
export function filterRestaurantsByCategory(
  restaurants: EnrichedRestaurantItem[],
  selectedCategoryId: string | null | undefined,
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];
  if (!selectedCategoryId || selectedCategoryId === 'ALL') return restaurants;

  return restaurants.filter((r) => {
    if (!r.categories || !Array.isArray(r.categories)) return false;
    return r.categories.some(
      (c) => c.id === selectedCategoryId || c.name.toLowerCase() === selectedCategoryId.toLowerCase(),
    );
  });
}

/**
 * Định dạng cự ly hiển thị km hoặc m.
 */
export function formatDistanceDisplay(distanceKm: number): string {
  if (isNaN(distanceKm) || distanceKm <= 0) return '0 m';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Định dạng thời gian giao hàng ETA.
 */
export function formatEtaDisplay(etaMinutes: number): string {
  if (isNaN(etaMinutes) || etaMinutes <= 0) return '15-20 phút';
  return `${etaMinutes} phút`;
}
