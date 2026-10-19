export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'COOKING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderDriverInfo {
  id: string;
  name: string;
  phone?: string;
  vehicle_plate?: string;
  vehicle_type?: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  options?: string[];
  notes?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address?: string;
  driver_id: string | null;
  driver?: OrderDriverInfo | null;
  total_amount: number;
  status: OrderStatus;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  restaurant_lat?: number | null;
  restaurant_lng?: number | null;
  distance_km?: number | null;
  note?: string | null;
  payment_method?: string;
  estimated_delivery_time?: string | null;
  cooking_at?: string | null;
  ready_at?: string | null;
  driver_claimed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
  review?: OrderReview;
}

export interface DriverLocationUpdate {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  remaining_km?: number | null;
  eta_minutes?: number | null;
  updatedAt: string;
}

export interface OrderReview {
  id: string;
  restaurant_rating: number | null;
  driver_rating: number | null;
  food_rating: number | null;
  comment: string | null;
  image_urls: string[] | null;
}

export interface CreateOrderReviewDto {
  restaurant_rating?: number;
  driver_rating?: number;
  food_rating?: number;
  comment?: string;
  image_urls?: string[];
}
