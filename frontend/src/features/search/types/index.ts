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
}
