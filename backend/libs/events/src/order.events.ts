export enum OrderEventTypes {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
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
