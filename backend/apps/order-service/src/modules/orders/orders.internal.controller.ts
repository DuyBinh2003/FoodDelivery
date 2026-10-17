import { Controller, Get, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';

@Controller('internal')
export class OrdersInternalController {
  constructor(
    @Inject(UpdateOrderStatusUseCase)
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  @Get('orders/metrics')
  async getMetrics() {
    const [totalOrders, totalGmv] = await Promise.all([
      this.orderReadRepo.countTotal(),
      this.orderReadRepo.sumCompletedAmount(),
    ]);

    return { totalOrders, totalGmv };
  }

  @Patch('orders/:id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
  ) {
    const dto: UpdateOrderStatusDto = { status };
    return this.updateOrderStatusUseCase.execute({ orderId: id, dto });
  }
}

