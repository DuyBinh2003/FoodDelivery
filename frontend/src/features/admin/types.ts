export interface AdminMetrics {
  totalUsers: number;
  totalRestaurants: number;
  totalDrivers: number;
  totalOrders: number;
  totalGmv: number;
  treasuryBalance: number;
  totalRevenue: number;
  restaurantCommission?: number;
  driverTripCommission?: number;
}

export interface AnalyticsTimeseriesPoint {
  date: string;
  gmv: number;
  orders: number;
  completed_orders: number;
  platform_revenue: number;
}

export interface RevenueBreakdownItem {
  name: string;
  value: number;
  color?: string;
}

export interface TreasuryTransactionItem {
  id: string;
  transaction_code: string;
  reference_type: string;
  reference_id: string;
  description: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface AdminAnalyticsResponse {
  metrics: AdminMetrics;
  timeseries: AnalyticsTimeseriesPoint[];
  statusDistribution: Record<string, number>;
  revenueBreakdown: RevenueBreakdownItem[];
  recentTreasuryTransactions: TreasuryTransactionItem[];
  isRealtimeDegraded: boolean;
  range: '7d' | '30d' | 'all';
}

export interface PlatformTreasurySummary {
  account_id: string;
  account_code: string;
  currency: string;
  available_balance: number;
  total_revenue: number;
  restaurant_commission_revenue: number;
  driver_trip_commission_revenue: number;
  other_revenue: number;
  recent_transactions: TreasuryTransactionItem[];
  total_transactions_count: number;
}

export interface AdminOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name?: string;
  name?: string;
  quantity: number;
  unit_price: number | string;
  price?: number | string;
  total_price: number | string;
}

export interface AdminOrder {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  total_amount: number | string;
  status: 'PENDING' | 'CONFIRMED' | 'COOKING' | 'READY_FOR_PICKUP' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  distance_km?: number | null;
  payment_method: string;
  note?: string;
  created_at: string;
  updated_at: string;
  items?: AdminOrderItem[];
}

export interface AdminPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
  full_name?: string | null;
  phone?: string | null;
}

export interface AdminDriver {
  id: string;
  user_id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  vehicle_plate?: string | null;
  vehicle_type?: string | null;
  created_at: string;
}

export interface AdminRestaurant {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  is_active: boolean;
  verification_status: string;
  rating: number;
  created_at: string;
}
