import { OrdersInternalController } from './orders.internal.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from '@/modules/orders/orders.controller.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { GetOrderHistoryUseCase } from '@/modules/orders/usecases/get-order-history.usecase.js';
import { CreateOrderReviewUseCase } from '@/modules/orders/usecases/create-order-review.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { ValidateCartUseCase } from '@/modules/orders/usecases/validate-cart.usecase.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderReview]),
  ],
  controllers: [OrdersController, OrdersInternalController],
  providers: [
    OrderReadRepository,
    OrderWriteRepository,
    SqsService,
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrderHistoryUseCase,
    CreateOrderReviewUseCase,
    UpdateOrderStatusUseCase,
    ValidateCartUseCase,
  ],
  exports: [
    OrderReadRepository,
    OrderWriteRepository,
    SqsService,
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrderHistoryUseCase,
    CreateOrderReviewUseCase,
    UpdateOrderStatusUseCase,
    ValidateCartUseCase,
  ],
})
export class OrdersModule {}
