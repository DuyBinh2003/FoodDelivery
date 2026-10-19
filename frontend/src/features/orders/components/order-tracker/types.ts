import type { Order, OrderStatus } from '@/features/orders/types';
import type { OrderPaymentDetails } from '@/features/payment';

export interface OrderTrackerProps {
  order: Order;
  paymentDetails?: OrderPaymentDetails | null;
}

export interface OrderLiveHeaderProps {
  orderId: string;
  isLive: boolean;
  isFetching: boolean;
  dataUpdatedAt?: number;
  onRefresh: () => void;
}

export interface OrderStatusBannerProps {
  status: OrderStatus;
  estimatedDeliveryTime?: string | null;
}

export interface OrderLiveStepperProps {
  currentStatus: OrderStatus;
  milestones?: {
    created_at?: string | null;
    cooking_at?: string | null;
    ready_at?: string | null;
    driver_claimed_at?: string | null;
    completed_at?: string | null;
  };
}

export interface OrderDriverCardProps {
  driver: {
    id: string;
    name: string;
    phone?: string;
    vehicle_plate?: string;
    vehicle_type?: string;
  };
}

export interface OrderVisualRouteProps {
  orderId: string;
  status: OrderStatus;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  deliveryAddress: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  distanceKm?: number | null;
  driverName?: string;
  driverId?: string | null;
}

export interface OrderStoreCardProps {
  restaurantName: string;
  restaurantAddress?: string;
  deliveryAddress: string;
  note?: string | null;
}

export interface OrderBillCardProps {
  order: Order;
  paymentDetails?: OrderPaymentDetails | null;
}

export interface OrderActionBarProps {
  status: OrderStatus;
  orderId: string;
  onCancel: () => void;
  isCancelling: boolean;
  onOpenReview: () => void;
  hasReview: boolean;
}
