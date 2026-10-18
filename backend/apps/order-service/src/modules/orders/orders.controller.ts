import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Get,
  Inject,
  UseGuards,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { OrderEventsService } from '@/modules/orders/services/order-events.service.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { QueryOrdersDto } from '@/modules/orders/dto/query-orders.dto.js';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { ValidateCartUseCase } from '@/modules/orders/usecases/validate-cart.usecase.js';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';
import { GetOrderHistoryUseCase } from '@/modules/orders/usecases/get-order-history.usecase.js';
import { CreateOrderReviewUseCase } from '@/modules/orders/usecases/create-order-review.usecase.js';
import { CreateOrderReviewDto } from '@/modules/orders/dto/create-order-review.dto.js';
import { GetOrdersAdminUseCase } from '@/modules/orders/usecases/get-orders-admin.usecase.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { JwtPayload } from '@/common/guards/jwt.strategy.js';
import { GetDriverTripsUseCase } from '@/modules/orders/usecases/get-driver-trips.usecase.js';
import { GetDriverSummaryUseCase } from '@/modules/orders/usecases/get-driver-summary.usecase.js';
import { GetDriverReviewsUseCase } from '@/modules/orders/usecases/get-driver-reviews.usecase.js';
import { UpdateDriverTripStatusUseCase } from '@/modules/orders/usecases/update-driver-trip-status.usecase.js';
import { ClaimDriverTripUseCase } from '@/modules/orders/usecases/claim-driver-trip.usecase.js';
import { GetAvailableDriverTripsUseCase } from '@/modules/orders/usecases/get-available-driver-trips.usecase.js';
import { GetRestaurantOrdersUseCase } from '@/modules/orders/usecases/get-restaurant-orders.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(CreateOrderUseCase) private readonly createOrderUseCase: CreateOrderUseCase,
    @Inject(GetOrderUseCase)    private readonly getOrderUseCase: GetOrderUseCase,
    @Inject(UpdateOrderStatusUseCase)
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    @Inject(ValidateCartUseCase)
    private readonly validateCartUseCase: ValidateCartUseCase,
    @Inject(GetOrderHistoryUseCase)
    private readonly getOrderHistoryUseCase: GetOrderHistoryUseCase,
    @Inject(CreateOrderReviewUseCase)
    private readonly createOrderReviewUseCase: CreateOrderReviewUseCase,
    @Inject(GetOrdersAdminUseCase)
    private readonly getOrdersAdminUseCase: GetOrdersAdminUseCase,
    @Inject(GetDriverTripsUseCase)
    private readonly getDriverTripsUseCase: GetDriverTripsUseCase,
    @Inject(GetDriverSummaryUseCase)
    private readonly getDriverSummaryUseCase: GetDriverSummaryUseCase,
    @Inject(GetDriverReviewsUseCase)
    private readonly getDriverReviewsUseCase: GetDriverReviewsUseCase,
    @Inject(UpdateDriverTripStatusUseCase)
    private readonly updateDriverTripStatusUseCase: UpdateDriverTripStatusUseCase,
    @Inject(ClaimDriverTripUseCase)
    private readonly claimDriverTripUseCase: ClaimDriverTripUseCase,
    @Inject(GetAvailableDriverTripsUseCase)
    private readonly getAvailableDriverTripsUseCase: GetAvailableDriverTripsUseCase,
    @Inject(GetRestaurantOrdersUseCase)
    private readonly getRestaurantOrdersUseCase: GetRestaurantOrdersUseCase,
    @Inject(OrderEventsService)
    private readonly orderEventsService: OrderEventsService,
  ) {}

  // --- Validate Cart (public — không cần auth) ---

  @Post('validate-cart')
  async validateCart(@Body() dto: ValidateCartDto) {
    return this.validateCartUseCase.execute(dto);
  }

  // --- Customer Endpoints ---

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.createOrderUseCase.execute({
      ...createOrderDto,
      customer_id: user.id,
    });
  }

  @Get('history/me')
  @UseGuards(JwtAuthGuard)
  getOrderHistory(@CurrentUser() user: JwtPayload) {
    return this.getOrderHistoryUseCase.execute({ customerId: user.id });
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  createReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrderReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createOrderReviewUseCase.execute({ orderId: id, customerId: user.id, dto });
  }

  // --- Driver Endpoints ---

  @Get('driver/trips')
  @UseGuards(JwtAuthGuard)
  getDriverTrips(@CurrentUser() user: JwtPayload) {
    return this.getDriverTripsUseCase.execute({ driverId: user.id });
  }

  @Get('driver/summary')
  @UseGuards(JwtAuthGuard)
  getDriverSummary(@CurrentUser() user: JwtPayload) {
    return this.getDriverSummaryUseCase.execute({ driverId: user.id });
  }

  @Get('driver/reviews')
  @UseGuards(JwtAuthGuard)
  getDriverReviews(@CurrentUser() user: JwtPayload) {
    return this.getDriverReviewsUseCase.execute({ driverId: user.id });
  }

  @Patch('driver/trips/:id/status')
  @UseGuards(JwtAuthGuard)
  updateDriverTripStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { status: OrderStatus },
  ) {
    return this.updateDriverTripStatusUseCase.execute({
      driverId: user.id,
      orderId: id,
      status: body.status,
    });
  }

  @Get('driver/available')
  @UseGuards(JwtAuthGuard)
  getAvailableTrips(@CurrentUser() user: JwtPayload) {
    return this.getAvailableDriverTripsUseCase.execute(user.id);
  }

  @Post(':id/driver-claim')
  @UseGuards(JwtAuthGuard)
  claimDriverTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.claimDriverTripUseCase.execute({
      orderId: id,
      driverId: user.id,
    });
  }

  // --- Restaurant / Merchant Endpoints ---

  @Get('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard)
  getRestaurantOrders(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return this.getRestaurantOrdersUseCase.execute({ restaurantId });
  }

  // --- General Order Endpoints ---

  @Get()
  @UseGuards(JwtAuthGuard)
  getOrders(@Query() query: QueryOrdersDto) {
    return this.getOrdersAdminUseCase.execute(query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateOrderStatusUseCase.execute({ orderId: id, dto: updateDto, changedBy: user.id });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrderUseCase.execute({ orderId: id });
  }

  @Sse(':id/events')
  @UseGuards(JwtAuthGuard)
  orderEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Observable<MessageEvent>> {
    return this.orderEventsService.streamOrderEvents(id, user);
  }
}


