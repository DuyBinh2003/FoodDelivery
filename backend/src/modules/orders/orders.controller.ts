import { Controller, Post, Body, Patch, Param, ParseUUIDPipe, Get } from '@nestjs/common';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
  ) {}

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
