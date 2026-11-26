/**
 * @file menu-catalog.utils.ts
 * @description Pure utility functions for /menu pagination, Circuit Breaker normalization, real metadata formatting & alias matching.
 */

import type { MenuItem, MenuItemTag } from '../../menu/types/index.ts';
import type {
  MenuPaginationMeta,
  MenuSection,
  PaginatedMenuResponse,
} from '../types/index.ts';

const MENU_CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
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

export function normalizeMenuItemTags(tags: unknown): MenuItemTag[] {
  if (!Array.isArray(tags)) return [];
  const result: MenuItemTag[] = [];
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.trim().length > 0) {
      result.push({ id: tag.trim(), name: tag.trim() });
    } else if (tag && typeof tag === 'object' && 'name' in tag) {
      const obj = tag as { id?: unknown; name?: unknown };
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : name;
      if (name) {
        result.push({ id, name });
      }
    }
  }
  return result;
}

export function sortMenuSectionItems(
  sections: MenuSection[],
  sortOption: string | undefined,
): MenuSection[] {
  if (!Array.isArray(sections)) return [];
  return sections.map((section) => {
    const itemsCopy = [...section.items];
    if (sortOption === 'price_asc') {
      itemsCopy.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortOption === 'price_desc') {
      itemsCopy.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortOption === 'name_asc') {
      itemsCopy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    return {
      ...section,
      items: itemsCopy,
    };
  });
}

export function resolveCategoryMatch(
  activeCategoryParam: string | null | undefined,
  category: { id: string; name: string },
): boolean {
  if (!activeCategoryParam) return false;
  const trimmed = activeCategoryParam.trim();
  if (!trimmed) return false;
  if (category.id === trimmed) return true;

  const lower = trimmed.toLowerCase();
  const catNameLower = category.name.trim().toLowerCase();
  if (catNameLower === lower) return true;

  const aliases = MENU_CATEGORY_SLUG_ALIASES[lower];
  if (!aliases) return false;
  return aliases.some((alias) => alias.toLowerCase() === catNameLower);
}

/**
 * Chuẩn hóa phản hồi từ /search/menu/paginated hoặc /search/menu,
 * xử lý an toàn cả khi Backend kích hoạt Circuit Breaker fallback ({ isFallback: true, items: [...] }).
 */
export function normalizePaginatedMenuResponse(
  raw: unknown,
  page = 1,
  limit = 8,
): PaginatedMenuResponse {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);

  if (Array.isArray(raw)) {
    const sections = raw as MenuSection[];
    const totalDishes = sections.reduce((sum, s) => sum + (s.items?.length ?? 0), 0);
    return {
      sections,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalRestaurants: sections.length,
        totalDishes,
        totalPages: sections.length > 0 ? 1 : 0,
        hasMore: false,
      },
      isFallback: false,
      circuitStatus: 'CLOSED',
    };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj.sections)) {
      const pagObj = (obj.pagination ?? {}) as Partial<MenuPaginationMeta>;
      const sections = obj.sections as MenuSection[];
      const totalDishesFromSections = sections.reduce(
        (sum, sec) => sum + (sec.items?.length ?? 0),
        0,
      );
      return {
        sections,
        pagination: {
          page: typeof pagObj.page === 'number' ? pagObj.page : safePage,
          limit: typeof pagObj.limit === 'number' ? pagObj.limit : safeLimit,
          totalRestaurants:
            typeof pagObj.totalRestaurants === 'number'
              ? pagObj.totalRestaurants
              : sections.length,
          totalDishes:
            typeof pagObj.totalDishes === 'number'
              ? pagObj.totalDishes
              : totalDishesFromSections,
          totalPages:
            typeof pagObj.totalPages === 'number'
              ? pagObj.totalPages
              : sections.length > 0
                ? 1
                : 0,
          hasMore: Boolean(pagObj.hasMore),
        },
        isFallback: Boolean(obj.isFallback),
        circuitStatus:
          typeof obj.circuitStatus === 'string' ? obj.circuitStatus : 'CLOSED',
        message: typeof obj.message === 'string' ? obj.message : undefined,
      };
    }

    // Legacy Circuit Breaker shape: { items: [...], total, isFallback: true, circuitStatus: 'OPEN' }
    if (Array.isArray(obj.items)) {
      const grouped = new Map<string, MenuSection>();
      for (const rawItem of obj.items) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as Partial<MenuItem> & { rating?: number };
        const restName = item.restaurant_name || 'Gợi ý phổ biến';
        const restId = item.restaurant_id || restName;
        const existing = grouped.get(restId) ?? {
          restaurant: restName,
          restaurant_id: item.restaurant_id,
          restaurant_rating: typeof item.rating === 'number' ? item.rating : 0,
          items: [],
        };
        existing.items.push({
          id: String(item.id ?? `fb-${existing.items.length}`),
          restaurant_id: String(item.restaurant_id ?? ''),
          restaurant_name: restName,
          name: String(item.name ?? 'Món gợi ý'),
          description: item.description,
          image_url: item.image_url,
          price: Number(item.price) || 0,
          original_price: item.original_price,
          options: Array.isArray(item.options) ? item.options : [],
          is_available: item.is_available !== false,
          tags: normalizeMenuItemTags(item.tags),
        });
        grouped.set(restId, existing);
      }

      const sections = Array.from(grouped.values());
      const totalDishes = sections.reduce((sum, s) => sum + s.items.length, 0);
      return {
        sections,
        pagination: {
          page: safePage,
          limit: safeLimit,
          totalRestaurants: sections.length,
          totalDishes,
          totalPages: sections.length > 0 ? 1 : 0,
          hasMore: false,
        },
        isFallback: Boolean(obj.isFallback ?? true),
        circuitStatus:
          typeof obj.circuitStatus === 'string' ? obj.circuitStatus : 'OPEN',
        message: typeof obj.message === 'string' ? obj.message : undefined,
      };
    }
  }

  return {
    sections: [],
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalRestaurants: 0,
      totalDishes: 0,
      totalPages: 0,
      hasMore: false,
    },
    isFallback: false,
    circuitStatus: 'CLOSED',
  };
}

/**
 * Hợp nhất các section nhà hàng khi cuộn lazy load trang mới, không trùng restaurant và không trùng món ăn.
 */
export function mergePaginatedMenuSections(
  existing: MenuSection[],
  incoming: MenuSection[],
): MenuSection[] {
  const base = Array.isArray(existing) ? existing : [];
  const next = Array.isArray(incoming) ? incoming : [];

  const resultMap = new Map<string, MenuSection>();

  const upsertSection = (sec: MenuSection) => {
    const key = sec.restaurant_id || sec.restaurant;
    const prev = resultMap.get(key);
    if (!prev) {
      resultMap.set(key, {
        ...sec,
        items: [...(sec.items ?? [])],
      });
      return;
    }

    const existingItemIds = new Set(prev.items.map((i) => i.id));
    const mergedItems = [...prev.items];
    for (const item of sec.items ?? []) {
      if (!existingItemIds.has(item.id)) {
        existingItemIds.add(item.id);
        mergedItems.push(item);
      }
    }

    resultMap.set(key, {
      ...prev,
      restaurant_banner_url: prev.restaurant_banner_url ?? sec.restaurant_banner_url,
      restaurant_rating: prev.restaurant_rating ?? sec.restaurant_rating,
      restaurant_total_reviews: prev.restaurant_total_reviews ?? sec.restaurant_total_reviews,
      restaurant_address: prev.restaurant_address ?? sec.restaurant_address,
      distance_km: prev.distance_km ?? sec.distance_km,
      items: mergedItems,
    });
  };

  for (const s of base) upsertSection(s);
  for (const s of next) upsertSection(s);

  return Array.from(resultMap.values());
}

/**
 * Định dạng thông tin đánh giá quán trung thực (tuyệt đối không chèn `4.8 (100+)` giả).
 */
export function formatRestaurantReviewMeta(
  rating?: number | null,
  totalReviews?: number | null,
): { ratingLabel: string; reviewsLabel: string | null } {
  const numericRating = Number(rating ?? 0);
  const numericReviews = Number(totalReviews ?? 0);

  return {
    ratingLabel:
      !Number.isNaN(numericRating) && numericRating > 0
        ? numericRating.toFixed(1)
        : 'Quán mới',
    reviewsLabel:
      !Number.isNaN(numericReviews) && numericReviews > 0
        ? `(${numericReviews} đánh giá)`
        : null,
  };
}
