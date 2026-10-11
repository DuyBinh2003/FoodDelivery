import { Controller, Post, Body, Patch, Param, ParseUUIDPipe, Get, Inject } from '@nestjs/common';
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

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.updateOrderStatusUseCase.execute({ orderId: id, dto: updateDto });
  }

  @Get('history/me')
  async getOrderHistory(@Body() _body: any) { // Temporary: in real app use req.user.id
    // Wait, typical NestJS app would get user id from JWT token guard.
    // For this boilerplate let's assume we pass customerId in query or req.user.
    // Since there's no JWT token injected here based on the boilerplate, we can get it from headers or query.
    // Actually, let's use a query param `?customerId=xxx` for simplicity in dev.
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
