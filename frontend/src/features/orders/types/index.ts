export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'COOKING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  restaurant_name: string;
  driver_id: string | null;
  total_amount: number;
  status: OrderStatus;
  delivery_address: string;
  items: OrderItem[];
  created_at: string;
  review?: OrderReview;
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
