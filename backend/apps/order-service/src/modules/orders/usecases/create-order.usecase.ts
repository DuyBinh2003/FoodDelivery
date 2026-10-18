import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { OrderRedisRepository, InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { OrderEventTypes } from '@/events/index.js';

export interface CreateOrderCommand extends CreateOrderDto {
  /** customer_id lấy từ JWT payload, không nhận từ body */
  customer_id: string;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(OrderRedisRepository) private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(SqsService) private readonly sqsService: SqsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    const orderId = randomUUID();
    const totalAmount = command.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );

    const now = new Date().toISOString();
    const orderData: InflightOrderData = {
      id: orderId,
      customer_id: command.customer_id,
      restaurant_id: command.restaurant_id,
      driver_id: null,
      status: OrderStatus.PENDING,
      delivery_address: command.delivery_address,
      delivery_lat: command.delivery_lat ?? null,
      delivery_lng: command.delivery_lng ?? null,
      recipient_name: command.recipient_name ?? null,
      recipient_phone: command.recipient_phone ?? null,
      note: command.note ?? null,
      payment_method: command.payment_method ?? 'CASH',
      total_amount: totalAmount,
      items: command.items.map((item) => ({
        id: randomUUID(),
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        options: item.options,
        notes: item.notes,
      })),
      created_at: now,
      updated_at: now,
    };

    // 1. Lưu snapshot trạng thái ban đầu vào Redis In-flight Cache
    await this.orderRedisRepo.saveInflightOrder(orderId, orderData);

    // 2. Đẩy message vào SQS Queue food-delivery-orders để nhà hàng tiếp nhận
    await this.sqsService.publishEvent(OrderEventTypes.ORDER_CREATED, orderData);

    // 3. Trả về ngay lập tức cho Client (Non-blocking, không chạm DB PostgreSQL)
    return {
      id: orderId,
      customer_id: orderData.customer_id,
      restaurant_id: orderData.restaurant_id,
      driver_id: null,
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
      delivery_address: orderData.delivery_address,
      delivery_lat: orderData.delivery_lat,
      delivery_lng: orderData.delivery_lng,
      recipient_name: orderData.recipient_name,
      recipient_phone: orderData.recipient_phone,
      note: orderData.note,
      estimated_delivery_time: null,
      payment_method: orderData.payment_method,
      created_at: new Date(now),
      updated_at: new Date(now),
      is_deleted: false,
      items: orderData.items,
    } as unknown as Order;
  }
}
