import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { OrderChatMessage } from '@/modules/chat/entities/order-chat-message.entity.js';

@Injectable()
export class OrderChatRepository {
  private readonly logger = new Logger(OrderChatRepository.name);

  constructor(
    @InjectRepository(OrderChatMessage)
    private readonly chatRepo: Repository<OrderChatMessage>,
  ) {}

  async createMessage(data: Partial<OrderChatMessage>): Promise<OrderChatMessage> {
    const msg = this.chatRepo.create(data);
    return this.chatRepo.save(msg);
  }

  async findMessagesByOrderId(
    orderId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ messages: OrderChatMessage[]; total: number }> {
    const [messages, total] = await this.chatRepo.findAndCount({
      where: {
        order_id: orderId,
        is_deleted: false,
      },
      order: {
        created_at: 'ASC',
      },
      take: limit,
      skip: offset,
    });

    return { messages, total };
  }

  async markSeen(orderId: string, readerId: string): Promise<number> {
    const now = new Date();
    const result = await this.chatRepo
      .createQueryBuilder()
      .update(OrderChatMessage)
      .set({
        is_read: true,
        read_at: now,
      })
      .where('order_id = :orderId AND sender_id != :readerId AND is_read = false AND is_deleted = false', {
        orderId,
        readerId,
      })
      .execute();

    return result.affected ?? 0;
  }

  async countUnread(orderId: string, userId: string): Promise<number> {
    return this.chatRepo.count({
      where: {
        order_id: orderId,
        sender_id: Not(userId),
        is_read: false,
        is_deleted: false,
      },
    });
  }
}
