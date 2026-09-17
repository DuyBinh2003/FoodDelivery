import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { SqsService } from '@/common/messaging/sqs.service.js';

@Injectable()
export class OrderWriteRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(SqsService) private readonly sqsService: SqsService,
  ) {}

  async createOrderWithItems(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const totalAmount = createOrderDto.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0,
      );

      const order = queryRunner.manager.create(Order, {
        customer_id: createOrderDto.customer_id,
        restaurant_id: createOrderDto.restaurant_id,
        delivery_address: createOrderDto.delivery_address,
        total_amount: totalAmount,
        status: OrderStatus.PENDING,
      });
      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = createOrderDto.items.map((item) => {
        return queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      });
      await queryRunner.manager.save(orderItems);

      await queryRunner.commitTransaction();

      await this.sqsService.publishEvent('ORDER_CREATED', {
        orderId: savedOrder.id,
        restaurantId: savedOrder.restaurant_id,
        customerId: savedOrder.customer_id,
        deliveryAddress: savedOrder.delivery_address,
      });

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
}
