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
import { ValidateCartUseCase } from '@/modules/orders/usecases/validate-cart.usecase.js';
import { RestaurantsModule } from '@/modules/restaurants/restaurants.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    RestaurantsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrderReadRepository,
    OrderWriteRepository,
    CreateOrderUseCase,
    GetOrderUseCase,
    UpdateOrderStatusUseCase,
    ValidateCartUseCase,
  ],
  exports: [
    OrderReadRepository,
    OrderWriteRepository,
    CreateOrderUseCase,
    GetOrderUseCase,
    UpdateOrderStatusUseCase,
    ValidateCartUseCase,
  ],
})
export class OrdersModule {}
