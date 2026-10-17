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
  status: OrderStatus;
  restaurantName: string;
  deliveryAddress: string;
  driverName?: string;
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
