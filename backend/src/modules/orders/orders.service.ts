import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { SqsService } from '@/common/messaging/sqs.service.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    private readonly sqsService: SqsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Calculate total amount
      const totalAmount = createOrderDto.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0,
      );

      // 2. Create Order
      const order = queryRunner.manager.create(Order, {
        customer_id: createOrderDto.customer_id,
        restaurant_id: createOrderDto.restaurant_id,
        delivery_address: createOrderDto.delivery_address,
        total_amount: totalAmount,
        status: OrderStatus.PENDING,
      });
      const savedOrder = await queryRunner.manager.save(order);

      // 3. Create Order Items
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

      // 4. Publish Event
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

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id, is_deleted: false } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    order.status = updateDto.status;
    return this.orderRepo.save(order);
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id, is_deleted: false } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }
}
