/**
 * @file home-feed.utils.ts
 * @description Pure utility functions for calculating restaurant distances, ETAs, filtering personalized feeds, and resolving media.
 */

const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  com: ['Cơm Tấm', 'Cơm'],
  'com-tam': ['Cơm Tấm'],
  'pho-bun': ['Phở', 'Bún Bò'],
  pho: ['Phở'],
  'bun-bo': ['Bún Bò'],
  'tra-sua': ['Trà Sữa'],
  'ga-ran': ['Gà Rán & Burger'],
  'ga-ran-burger': ['Gà Rán & Burger'],
  'banh-mi': ['Bánh Mì'],
  'pizza-mi-y': ['Pizza & Mì Ý'],
  'mon-chay': ['Món Chay'],
  'ca-phe': ['Cà Phê & Bánh'],
  'ca-phe-banh': ['Cà Phê & Bánh'],
  'an-vat': ['Giải khát', 'Trà Sữa'],
  'giai-khat': ['Giải khát'],
};

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

  const R = 6371;
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

export interface HomeCategoryItem {
  id: string;
  name: string;
  icon_url?: string | null;
}

export interface HomeRestaurantItem {
  id: string;
  name: string;
  address?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  rating?: number | string | null;
  categories?: HomeCategoryItem[];
  tags?: string[];
  is_active?: boolean;
  banner_url?: string | null;
  image_url?: string | null;
  discount_label?: string | null;
  is_freeship?: boolean;
  has_promo?: boolean;
  max_discount_percent?: number;
  promo_item_count?: number;
  order_count?: number;
}

export interface EnrichedRestaurantItem extends HomeRestaurantItem {
  distance_km: number;
  eta_minutes: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedRestaurantsResponse {
  items: HomeRestaurantItem[];
  pagination: PaginationMeta;
}

export interface FeaturedDishOptionChoice {
  id: string;
  name: string;
  price: number;
  is_default?: boolean;
}

export interface FeaturedDishOptionGroup {
  id: string;
  name: string;
  required: boolean;
  min_choices?: number;
  max_choices?: number;
  choices: FeaturedDishOptionChoice[];
}

export interface FeaturedDishItem {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_banner_url?: string;
  restaurant_rating?: number;
  category_id?: string;
  category?: { id: string; name: string; icon_url?: string };
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number;
  discount_percent?: number;
  options?: FeaturedDishOptionGroup[];
  is_available: boolean;
  tags?: Array<{ id: string; name: string }>;
}

export interface PaginatedFeaturedDishesResponse {
  items: FeaturedDishItem[];
  pagination: PaginationMeta;
}

/**
 * Ưu tiên ảnh banner_url thật từ DB/S3, fallback sang image_url nếu có, không dùng URL giả ngoài hệ thống.
 */
export function resolveRestaurantImageSrc(
  restaurant: Pick<HomeRestaurantItem, 'banner_url' | 'image_url'> | null | undefined,
): string | null {
  if (!restaurant) return null;
  const banner = typeof restaurant.banner_url === 'string' ? restaurant.banner_url.trim() : '';
  if (banner) return banner;
  const img = typeof restaurant.image_url === 'string' ? restaurant.image_url.trim() : '';
  return img || null;
}

/**
 * Gộp danh sách không trùng lặp ID (bảo toàn thứ tự xuất hiện ban đầu).
 */
export function dedupeById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  if (!Array.isArray(existing) && !Array.isArray(incoming)) return [];
  const base = Array.isArray(existing) ? existing : [];
  const next = Array.isArray(incoming) ? incoming : [];

  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of base) {
    if (item?.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  for (const item of next) {
    if (item?.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Tính thời gian giao hàng dự kiến (ETA) dựa trên cự ly km.
 */
export function calculateRestaurantEtaMinutes(distanceKm: number): number {
  if (Number.isNaN(distanceKm) || distanceKm <= 0) {
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
 */
export function filterNearYouRestaurants(
  restaurants: EnrichedRestaurantItem[],
  maxRadiusKm = 3.0,
  maxEtaMinutes = 25,
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];

  return restaurants
    .filter(
      (r) =>
        r.is_active !== false &&
        r.distance_km > 0 &&
        r.distance_km <= maxRadiusKm &&
        r.eta_minutes <= maxEtaMinutes,
    )
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Khối 2: Lọc quán "Đang có khuyến mãi" dựa trên dữ liệu ưu đãi thật (món giảm giá / campaign / freeship)
 */
export function filterPromoRestaurants(
  restaurants: EnrichedRestaurantItem[],
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];

  return restaurants.filter(
    (r) =>
      r.is_active !== false &&
      (r.has_promo === true ||
        (typeof r.max_discount_percent === 'number' && r.max_discount_percent > 0) ||
        r.is_freeship === true ||
        (typeof r.discount_label === 'string' && r.discount_label.trim().length > 0)),
  );
}

/**
 * Khối 3: Lọc quán "Quán ngon nổi bật" (Top Rated / Trending)
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
 * Lọc quán ăn theo danh mục (hỗ trợ cả UUID danh mục DB, tên danh mục, và slug kế thừa).
 */
export function filterRestaurantsByCategory(
  restaurants: EnrichedRestaurantItem[],
  selectedCategoryId: string | null | undefined,
): EnrichedRestaurantItem[] {
  if (!Array.isArray(restaurants)) return [];
  if (!selectedCategoryId || selectedCategoryId === 'ALL') return restaurants;

  const targetLower = selectedCategoryId.trim().toLowerCase();
  const aliasNames = (CATEGORY_SLUG_ALIASES[targetLower] ?? []).map((n) => n.toLowerCase());

  return restaurants.filter((r) => {
    if (!r.categories || !Array.isArray(r.categories)) return false;
    return r.categories.some((c) => {
      const catNameLower = c.name.trim().toLowerCase();
      return (
        c.id === selectedCategoryId ||
        catNameLower === targetLower ||
        aliasNames.includes(catNameLower)
      );
    });
  });
}

/**
 * Định dạng cự ly hiển thị km hoặc m.
 */
export function formatDistanceDisplay(distanceKm: number): string {
  if (Number.isNaN(distanceKm) || distanceKm <= 0) return '0 m';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Định dạng thời gian giao hàng ETA.
 */
export function formatEtaDisplay(etaMinutes: number): string {
  if (Number.isNaN(etaMinutes) || etaMinutes <= 0) return '15-20 phút';
  return `${etaMinutes} phút`;
}
