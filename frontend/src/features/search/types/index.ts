import type { MenuItem } from '@/features/menu/types';

/** Danh mục món ăn (Category) */
export interface Category {
  id: string;
  name: string;
}

/** Tag/Nhãn gắn cho món ăn */
export interface Tag {
  id: string;
  name: string;
}

/** Một section nhóm món ăn theo nhà hàng */
export interface MenuSection {
  restaurant: string;
  items: MenuItem[];
}

/** Params tìm kiếm/lọc thực đơn */
export interface MenuSearchParams {
  q?: string;
  category?: string;
  tag?: string;
  lat?: number;
  lon?: number;
  radius?: string;
  sort_by?: 'relevance' | 'distance' | 'rating';
  open_only?: boolean;
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
