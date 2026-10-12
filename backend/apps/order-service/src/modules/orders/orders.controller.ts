import { Controller, Post, Body, Patch, Param, ParseUUIDPipe, Get, Inject, UseGuards, Query } from '@nestjs/common';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { ValidateCartUseCase } from '@/modules/orders/usecases/validate-cart.usecase.js';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';
import { GetOrderHistoryUseCase } from '@/modules/orders/usecases/get-order-history.usecase.js';
import { CreateOrderReviewUseCase } from '@/modules/orders/usecases/create-order-review.usecase.js';
import { CreateOrderReviewDto } from '@/modules/orders/dto/create-order-review.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { JwtPayload } from '@/common/guards/jwt.strategy.js';
import { GetDriverTripsUseCase } from '@/modules/orders/usecases/get-driver-trips.usecase.js';
import { GetDriverSummaryUseCase } from '@/modules/orders/usecases/get-driver-summary.usecase.js';
import { GetDriverReviewsUseCase } from '@/modules/orders/usecases/get-driver-reviews.usecase.js';
import { UpdateDriverTripStatusUseCase } from '@/modules/orders/usecases/update-driver-trip-status.usecase.js';
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
    @Inject(GetDriverTripsUseCase)
    private readonly getDriverTripsUseCase: GetDriverTripsUseCase,
    @Inject(GetDriverSummaryUseCase)
    private readonly getDriverSummaryUseCase: GetDriverSummaryUseCase,
    @Inject(GetDriverReviewsUseCase)
    private readonly getDriverReviewsUseCase: GetDriverReviewsUseCase,
    @Inject(UpdateDriverTripStatusUseCase)
    private readonly updateDriverTripStatusUseCase: UpdateDriverTripStatusUseCase,
  ) {}

  @Post('validate-cart')
  async validateCart(@Body() dto: ValidateCartDto) {
    try {
      return await this.validateCartUseCase.execute(dto);
    } catch (error: any) {
      return { message: error.message, stack: error.stack, error: 'Debug Error' };
    }
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.createOrderUseCase.execute(createOrderDto);
  }

  // --- Driver Endpoints ---

  @Get('driver/trips')
  @UseGuards(JwtAuthGuard)
  getDriverTrips(@CurrentUser() user: JwtPayload, @Query('driverId') queryDriverId?: string) {
    const driverId = user?.id || queryDriverId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    return this.getDriverTripsUseCase.execute({ driverId });
  }

  @Get('driver/summary')
  @UseGuards(JwtAuthGuard)
  getDriverSummary(@CurrentUser() user: JwtPayload, @Query('driverId') queryDriverId?: string) {
    const driverId = user?.id || queryDriverId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    return this.getDriverSummaryUseCase.execute({ driverId });
  }

  @Get('driver/reviews')
  @UseGuards(JwtAuthGuard)
  getDriverReviews(@CurrentUser() user: JwtPayload, @Query('driverId') queryDriverId?: string) {
    const driverId = user?.id || queryDriverId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    return this.getDriverReviewsUseCase.execute({ driverId });
  }

  @Patch('driver/trips/:id/status')
  @UseGuards(JwtAuthGuard)
  updateDriverTripStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { status: OrderStatus },
  ) {
    const driverId = user?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    return this.updateDriverTripStatusUseCase.execute({
      driverId,
      orderId: id,
      status: body.status,
    });
  }

  // --- General Order Endpoints ---

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.updateOrderStatusUseCase.execute({ orderId: id, dto: updateDto });
  }

  @Get('history/me')
  async getOrderHistory(@Body() _body: any) {
    const customerId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // hardcoded to user 1 for dev
    return this.getOrderHistoryUseCase.execute({ customerId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrderUseCase.execute({ orderId: id });
  }

  @Post(':id/reviews')
  createReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrderReviewDto,
  ) {
    const customerId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // hardcoded to user 1 for dev
    return this.createOrderReviewUseCase.execute({ orderId: id, customerId, dto });
  }
}

