import { OrdersInternalController } from '@/modules/orders/orders.internal.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@/common/guards/jwt.strategy.js';
import { OrdersController } from '@/modules/orders/orders.controller.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';
import { Voucher } from '@/modules/orders/entities/voucher.entity.js';
import { VoucherUsage } from '@/modules/orders/entities/voucher-usage.entity.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
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
import { ClaimDriverTripUseCase } from '@/modules/orders/usecases/claim-driver-trip.usecase.js';
import { GetAvailableDriverTripsUseCase } from '@/modules/orders/usecases/get-available-driver-trips.usecase.js';
import { GetRestaurantOrdersUseCase } from '@/modules/orders/usecases/get-restaurant-orders.usecase.js';
import { CreateVoucherUseCase } from '@/modules/orders/usecases/create-voucher.usecase.js';
import { ValidateVoucherUseCase } from '@/modules/orders/usecases/validate-voucher.usecase.js';
import { ApplyVoucherUseCase } from '@/modules/orders/usecases/apply-voucher.usecase.js';
import { RevertVoucherUseCase } from '@/modules/orders/usecases/revert-voucher.usecase.js';
import { GetAvailableVouchersUseCase } from '@/modules/orders/usecases/get-available-vouchers.usecase.js';
import { VouchersController } from '@/modules/orders/vouchers.controller.js';
import { GetRestaurantReviewsUseCase } from '@/modules/orders/usecases/get-restaurant-reviews.usecase.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { SnsService } from '@/common/messaging/sns.service.js';
import { OrderIngestionConsumer } from '@/modules/orders/consumers/order-ingestion.consumer.js';
import { OrderEventsService } from '@/modules/orders/services/order-events.service.js';
import { StorageModule } from '@/common/storage/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderReview, Voucher, VoucherUsage]),
    StorageModule,
    TypeOrmModule.forFeature([Order, OrderItem, OrderReview]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [OrdersController, OrdersInternalController, VouchersController],
  providers: [
    OrderReadRepository,
    OrderWriteRepository,
    OrderRedisRepository,
    OrderIngestionConsumer,
    OrderEventsService,
    SqsService,
    SnsService,
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
    ClaimDriverTripUseCase,
    GetAvailableDriverTripsUseCase,
    GetRestaurantOrdersUseCase,
    VoucherRepository,
    CreateVoucherUseCase,
    ValidateVoucherUseCase,
    ApplyVoucherUseCase,
    RevertVoucherUseCase,
    GetAvailableVouchersUseCase,
    GetRestaurantReviewsUseCase,
  ],
  exports: [
    OrderReadRepository,
    OrderWriteRepository,
    OrderRedisRepository,
    OrderEventsService,
    SqsService,
    SnsService,
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
    ClaimDriverTripUseCase,
    GetAvailableDriverTripsUseCase,
    GetRestaurantOrdersUseCase,
    VoucherRepository,
    CreateVoucherUseCase,
    ValidateVoucherUseCase,
    ApplyVoucherUseCase,
    RevertVoucherUseCase,
    GetAvailableVouchersUseCase,
    GetRestaurantReviewsUseCase,
  ],
})
export class OrdersModule { }

