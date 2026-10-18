import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';
import { CreateOrderCommand } from '@/modules/orders/usecases/create-order.usecase.js';
import { InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { OrderEventTypes } from '@/events/index.js';

@Injectable()
export class OrderWriteRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderReview)
    private readonly orderReviewRepo: Repository<OrderReview>,
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(SqsService) private readonly sqsService: SqsService,
  ) {}

  async createOrderWithItems(command: CreateOrderCommand): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const subtotal = command.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0,
      );
      const deliveryFee = 15000;
      const totalAmount = subtotal + deliveryFee;

      const order = queryRunner.manager.create(Order, {
        customer_id: command.customer_id,
        restaurant_id: command.restaurant_id,
        delivery_address: command.delivery_address,
        note: command.note ?? null,
        payment_method: command.payment_method ?? 'CASH',
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        status: OrderStatus.PENDING,
      });
      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = command.items.map((item) => {
        return queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      });
      await queryRunner.manager.save(orderItems);

      await queryRunner.commitTransaction();

      await this.sqsService.publishEvent(OrderEventTypes.ORDER_CREATED, {
        orderId: savedOrder.id,
        restaurantId: savedOrder.restaurant_id,
        userId: savedOrder.customer_id,
        subtotal,
        deliveryFee,
        totalAmount: totalAmount,
        shippingAddress: savedOrder.delivery_address,
      });

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async persistCompletedOrder(orderData: InflightOrderData): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const subtotal = orderData.subtotal ?? orderData.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const deliveryFee = orderData.delivery_fee ?? 15000;
      const totalAmount = orderData.total_amount ?? (subtotal + deliveryFee);

      const order = queryRunner.manager.create(Order, {
        id: orderData.id,
        customer_id: orderData.customer_id,
        restaurant_id: orderData.restaurant_id,
        driver_id: orderData.driver_id ?? undefined,
        delivery_address: orderData.delivery_address,
        delivery_lat: orderData.delivery_lat ?? null,
        delivery_lng: orderData.delivery_lng ?? null,
        recipient_name: orderData.recipient_name ?? null,
        recipient_phone: orderData.recipient_phone ?? null,
        note: orderData.note ?? null,
        payment_method: orderData.payment_method ?? 'CASH',
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        status: orderData.status,
        cooking_at: orderData.cooking_at ? new Date(orderData.cooking_at) : null,
        ready_at: orderData.ready_at ? new Date(orderData.ready_at) : null,
        driver_claimed_at: orderData.driver_claimed_at ? new Date(orderData.driver_claimed_at) : null,
        completed_at: orderData.completed_at ? new Date(orderData.completed_at) : null,
        cancelled_at: orderData.cancelled_at ? new Date(orderData.cancelled_at) : null,
        created_at: orderData.created_at ? new Date(orderData.created_at) : undefined,
      });
      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = orderData.items.map((item) => {
        return queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      });
      await queryRunner.manager.save(orderItems);

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async save(order: Order): Promise<Order> {
    return this.orderRepo.save(order);
  }

  async saveReview(review: OrderReview): Promise<OrderReview> {
    return this.orderReviewRepo.save(review);
  }
}
