import { OrdersInternalController } from '@/modules/orders/orders.internal.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@/common/guards/jwt.strategy.js';
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
import { GetDriverTripsUseCase } from '@/modules/orders/usecases/get-driver-trips.usecase.js';
import { GetDriverSummaryUseCase } from '@/modules/orders/usecases/get-driver-summary.usecase.js';
import { GetDriverReviewsUseCase } from '@/modules/orders/usecases/get-driver-reviews.usecase.js';
import { UpdateDriverTripStatusUseCase } from '@/modules/orders/usecases/update-driver-trip-status.usecase.js';
import { GetOrdersAdminUseCase } from '@/modules/orders/usecases/get-orders-admin.usecase.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderReview]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [OrdersController, OrdersInternalController],
  providers: [
    OrderReadRepository,
    OrderWriteRepository,
    SqsService,
    JwtStrategy,
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrderHistoryUseCase,
    CreateOrderReviewUseCase,
    UpdateOrderStatusUseCase,
    ValidateCartUseCase,
    GetDriverTripsUseCase,
    GetDriverSummaryUseCase,
    GetDriverReviewsUseCase,
    UpdateDriverTripStatusUseCase,
    GetOrdersAdminUseCase,
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
    GetDriverTripsUseCase,
    GetDriverSummaryUseCase,
    GetDriverReviewsUseCase,
    UpdateDriverTripStatusUseCase,
    GetOrdersAdminUseCase,
  ],
})
export class OrdersModule {}

