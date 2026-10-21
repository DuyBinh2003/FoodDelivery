export interface MenuItemCategory {
  id: string;
  name: string;
  icon_url?: string;
}

export interface MenuItemTag {
  id: string;
  name: string;
}

export interface MenuItemOptionChoice {
  id: string;
  name: string;
  price: number;
  is_default?: boolean;
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  required: boolean;
  min_choices?: number;
  max_choices?: number;
  choices: MenuItemOptionChoice[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  price: number;
  original_price?: number;
  is_available: boolean;
  restaurant_name?: string;
  image_url?: string;
  description?: string;
  category?: MenuItemCategory;
  tags?: MenuItemTag[];
  options?: MenuItemOptionGroup[];
}

export interface RestaurantCategory {
  id: string;
  name: string;
  icon_url?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  rating?: number;
  rating_count?: number;
  verification_status?: string;
  lat?: number;
  lon?: number;
  cover_url?: string;
  image_url?: string;
  banner_url?: string;
  discount_label?: string;
  is_freeship?: boolean;
  categories?: RestaurantCategory[];
}
