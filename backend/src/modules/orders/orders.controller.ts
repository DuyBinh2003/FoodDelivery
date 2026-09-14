import { Controller, Post, Body, Patch, Param, ParseUUIDPipe, Get } from '@nestjs/common';
import { OrdersService } from '@/modules/orders/orders.service.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }
}
