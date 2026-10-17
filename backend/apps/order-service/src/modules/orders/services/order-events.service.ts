import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  MessageEvent,
} from '@nestjs/common';
import { Observable, concat, of } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import type { JwtPayload } from '@/common/guards/jwt.strategy.js';

@Injectable()
export class OrderEventsService {
  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async streamOrderEvents(
    orderId: string,
    user: JwtPayload,
  ): Promise<Observable<MessageEvent>> {
    // 1. Fetch current order to verify existence & authorization
    let initialOrder: Record<string, unknown> | null =
      (await this.orderRedisRepo.getInflightOrder(orderId)) as unknown as Record<string, unknown>;

    if (!initialOrder) {
      const dbOrder = await this.orderReadRepo.findById(orderId);
      if (!dbOrder) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      initialOrder = dbOrder as unknown as Record<string, unknown>;
    }

    // 2. Authorization check
    if (
      (user.role === 'CUSTOMER' || user.role === 'USER') &&
      initialOrder.customer_id !== user.id
    ) {
      throw new ForbiddenException('You are not authorized to view this order');
    }
    if (
      user.role === 'DRIVER' &&
      initialOrder.driver_id &&
      initialOrder.driver_id !== user.id
    ) {
      throw new ForbiddenException('You are not authorized to view this order');
    }

    // 3. Create stream: initial state + subsequent Redis Pub/Sub events
    const initial$ = of(initialOrder);
    const updates$ = this.orderRedisRepo.subscribeOrderEvents(orderId);

    return concat(initial$, updates$).pipe(
      map((orderData) => ({
        data: orderData,
      } as MessageEvent)),
      takeWhile((msg) => {
        const order = msg.data as { status?: string };
        return (
          order?.status !== OrderStatus.COMPLETED &&
          order?.status !== OrderStatus.CANCELLED
        );
      }, true), // inclusive: emit terminal status before completing the stream
    );
  }
}
