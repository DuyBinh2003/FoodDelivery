export enum OrderEventTypes {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_COOKING = 'ORDER_COOKING',
  ORDER_READY_FOR_PICKUP = 'ORDER_READY_FOR_PICKUP',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
}

export interface OrderCreatedEvent {
  event: OrderEventTypes.ORDER_CREATED;
  data: {
    orderId: string;
    restaurantId: string;
    userId: string;
    totalAmount: number;
    shippingAddress: string;
  };
}

export interface OrderAcceptedEvent {
  event: OrderEventTypes.ORDER_ACCEPTED;
  data: {
    orderId: string;
    restaurantId: string;
    customerId: string;
    estimatedDeliveryTime?: string;
  };
}

export interface OrderStatusChangedEvent {
  event: OrderEventTypes.ORDER_STATUS_CHANGED;
  data: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    changedAt: string;
    changedBy?: string;
  };
}
