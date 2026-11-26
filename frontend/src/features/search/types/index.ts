import type { MenuItem } from '@/features/menu/types';

/** Danh mục món ăn (Category) */
export interface Category {
  id: string;
  name: string;
  icon_url?: string;
}

/** Tag/Nhãn gắn cho món ăn */
export interface Tag {
  id: string;
  name: string;
}

/** Một section nhóm món ăn theo nhà hàng */
export interface MenuSection {
  restaurant: string;
  restaurant_id?: string;
  restaurant_banner_url?: string;
  restaurant_rating?: number;
  restaurant_total_reviews?: number;
  restaurant_address?: string;
  distance_km?: number;
  items: MenuItem[];
}

/** Thông tin phân trang cho catalog /menu */
export interface MenuPaginationMeta {
  page: number;
  limit: number;
  totalRestaurants: number;
  totalDishes: number;
  totalPages: number;
  hasMore: boolean;
}

/** Phản hồi chuẩn hóa từ endpoint phân trang /search/menu/paginated */
export interface PaginatedMenuResponse {
  sections: MenuSection[];
  pagination: MenuPaginationMeta;
  isFallback: boolean;
  circuitStatus: 'CLOSED' | 'DEGRADED' | 'OPEN' | string;
  message?: string;
}

/** Params tìm kiếm/lọc thực đơn */
export interface MenuSearchParams {
  q?: string;
  category?: string;
  tag?: string;
  promo?: string;
  lat?: number;
  lon?: number;
  radius?: string;
  sort_by?: 'relevance' | 'distance' | 'rating';
  open_only?: boolean;
  page?: number;
  limit?: number;
}

/** Món ăn trong gợi ý tìm kiếm */
export interface SearchSuggestionDish {
  id: string;
  name: string;
  price: number;
  restaurant_id: string;
  restaurant_name: string;
}

/** Nhà hàng trong gợi ý tìm kiếm */
export interface SearchSuggestionRestaurant {
  id: string;
  name: string;
  rating: number;
  distance_km?: number;
}

/** Kết quả trả về từ endpoint gợi ý tìm kiếm tức thời */
export interface SearchSuggestionResult {
  keywords: string[];
  dishes: SearchSuggestionDish[];
  restaurants: SearchSuggestionRestaurant[];
}
