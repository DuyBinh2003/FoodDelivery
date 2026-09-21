import { Controller, Post, Body, Patch, Param, ParseUUIDPipe, Get, Inject } from '@nestjs/common';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { ValidateCartUseCase } from '@/modules/orders/usecases/validate-cart.usecase.js';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(CreateOrderUseCase) private readonly createOrderUseCase: CreateOrderUseCase,
    @Inject(GetOrderUseCase)    private readonly getOrderUseCase: GetOrderUseCase,
    @Inject(UpdateOrderStatusUseCase)
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    @Inject(ValidateCartUseCase)
    private readonly validateCartUseCase: ValidateCartUseCase,
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

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrderUseCase.execute({ orderId: id });
  }
}
