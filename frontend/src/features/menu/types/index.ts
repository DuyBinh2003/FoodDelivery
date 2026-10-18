export interface MenuItemCategory {
  id: string;
  name: string;
  icon_url?: string;
}

export interface MenuItemTag {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  price: number;
  is_available: boolean;
  restaurant_name?: string;
  image_url?: string;
  description?: string;
  category?: MenuItemCategory;
  tags?: MenuItemTag[];
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
  verification_status?: string;
  lat?: number;
  lon?: number;
  categories?: RestaurantCategory[];
}
