import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from '@/modules/orders/orders.controller.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrdersController],
  providers: [
    OrderReadRepository,
    OrderWriteRepository,
    CreateOrderUseCase,
    GetOrderUseCase,
    UpdateOrderStatusUseCase,
  ],
  exports: [
    OrderReadRepository,
    OrderWriteRepository,
    CreateOrderUseCase,
    GetOrderUseCase,
    UpdateOrderStatusUseCase,
  ],
})
export class OrdersModule {}
