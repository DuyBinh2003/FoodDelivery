export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  is_available: boolean;
  restaurant_name?: string;
  image_url?: string;
  description?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
}
