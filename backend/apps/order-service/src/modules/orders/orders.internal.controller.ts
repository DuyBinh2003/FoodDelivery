import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, Query } from '@nestjs/common';
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

  @Get('orders/analytics-timeseries')
  async getAnalyticsTimeseries(@Query('range') range?: '7d' | '30d' | 'all') {
    return this.orderReadRepo.getAnalyticsTimeSeries(range || '7d');
  }

  @Get('orders/admin-list')
  async getAdminOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const result = await this.orderReadRepo.findWithFilters({
      page: p,
      limit: l,
      status: status || undefined,
      search: search || undefined,
    });

    return {
      data: result.data,
      total: result.total,
      page: p,
      limit: l,
      totalPages: Math.ceil(result.total / l),
    };
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

