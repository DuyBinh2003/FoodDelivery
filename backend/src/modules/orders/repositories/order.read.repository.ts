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
    return this.orderRepo.findOne({ where: { id, is_deleted: false } });
  }
}
