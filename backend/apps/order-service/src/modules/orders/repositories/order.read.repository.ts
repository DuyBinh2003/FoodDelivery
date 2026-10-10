import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class OrderReadRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { id, is_deleted: false },
      relations: { items: true, review: true },
    });
  }

  async findHistoryByCustomerId(customerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { customer_id: customerId, is_deleted: false },
      relations: { items: true, review: true },
      order: { created_at: 'DESC' },
    });
  }
}
