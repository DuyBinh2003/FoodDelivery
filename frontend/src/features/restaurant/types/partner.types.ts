import type { MenuItemOptionGroup } from '@/features/menu/types';

export interface CategoryItem {
  id: string;
  name: string;
  icon_url?: string;
}

export interface TagItem {
  id: string;
  name: string;
}

export interface PartnerMenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string | null;
  category?: CategoryItem | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  original_price?: number;
  is_available: boolean;
  tags?: TagItem[];
  options?: MenuItemOptionGroup[];
  created_at?: string;
  updated_at?: string;
}

export interface PartnerRestaurant {
  id: string;
  owner_id: string;
  name: string;
  address?: string;
  banner_url?: string;
  is_active: boolean;
  verification_status: string;
  rating: number;
  categories: CategoryItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PartnerRestaurantData {
  restaurant: PartnerRestaurant;
  menuItems: PartnerMenuItem[];
}

export interface CreateMenuItemPayload {
  name: string;
  price: number;
  original_price?: number;
  description?: string;
  image_url?: string;
  is_available?: boolean;
  category_id?: string;
  tag_ids?: string[];
  options?: MenuItemOptionGroup[];
}

export interface UpdateMenuItemPayload {
  name?: string;
  price?: number;
  original_price?: number;
  description?: string;
  image_url?: string;
  is_available?: boolean;
  category_id?: string;
  tag_ids?: string[];
  options?: MenuItemOptionGroup[];
}

export interface UpdateRestaurantProfilePayload {
  name?: string;
  address?: string;
  category_ids?: string[];
  banner_url?: string;
}
