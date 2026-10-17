import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { QueryOrdersDto } from '@/modules/orders/dto/query-orders.dto.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

export interface PaginatedOrdersResult {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetOrdersAdminUseCase {
  constructor(
    @Inject(OrderReadRepository) private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(query: QueryOrdersDto): Promise<PaginatedOrdersResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.orderReadRepo.findWithFilters(query);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
