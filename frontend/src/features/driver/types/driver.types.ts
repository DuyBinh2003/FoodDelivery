export type DriverStatus = 'ONLINE' | 'OFFLINE';

export interface DriverTripItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  name?: string;
}

export interface DriverTripReview {
  id: string;
  driver_rating: number | null;
  restaurant_rating: number | null;
  comment: string | null;
  created_at: string | Date;
}

export interface DriverTrip {
  id: string;
  order_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'COOKING' | 'READY_FOR_PICKUP' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  total_amount: number;
  driver_earnings: number;
  pickup_name: string;
  pickup_address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_address: string;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  distance_km?: number | null;
  claimed_at?: string | Date | null;
  completed_at?: string | Date | null;
  duration_minutes?: number | null;
  created_at: string | Date;
  updated_at: string | Date;
  items: DriverTripItem[];
  review?: DriverTripReview | null;
}

export interface DriverSummary {
  total_trips: number;
  completed_trips: number;
  total_earnings: number;
  today_trips: number;
  today_earnings: number;
  average_rating: number;
  total_reviews: number;
}

export interface DriverReviewItem {
  id: string;
  order_id: string;
  driver_rating: number;
  comment: string | null;
  image_urls?: string[] | null;
  created_at: string | Date;
  delivery_address: string;
}

export interface DriverReviewsResponse {
  average_rating: number;
  total_reviews: number;
  star_counts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: DriverReviewItem[];
}
