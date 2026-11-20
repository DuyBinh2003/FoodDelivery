import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThan } from 'typeorm';
import { OutboxEvent, OutboxStatus } from '@/common/outbox/entities/outbox-event.entity.js';

export interface CreateOutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class TransactionalOutboxService {
  private readonly logger = new Logger(TransactionalOutboxService.name);

  constructor(
    @Optional()
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo?: Repository<OutboxEvent>,
  ) {}

  /**
   * Lưu sự kiện Outbox bên trong cùng Transaction ACID với entity nghiệp vụ
   */
  async saveEvent(manager: EntityManager, input: CreateOutboxEventInput): Promise<OutboxEvent> {
    const repo = manager.getRepository(OutboxEvent);
    const event = repo.create({
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      event_type: input.eventType,
      payload: input.payload,
      status: OutboxStatus.PENDING,
      retry_count: 0,
      created_at: new Date(),
      published_at: null,
      error_message: null,
    });

    const saved = await repo.save(event);
    this.logger.debug(
      `Saved Outbox event [${saved.event_type}] for aggregate [${saved.aggregate_type}:${saved.aggregate_id}] with ID ${saved.id}`,
    );
    return saved;
  }

  /**
   * Lưu sự kiện độc lập khi không nằm trong transaction
   */
  async saveEventStandalone(input: CreateOutboxEventInput): Promise<OutboxEvent> {
    if (!this.outboxRepo) {
      throw new Error('Outbox repository is not initialized');
    }

    const event = this.outboxRepo.create({
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      event_type: input.eventType,
      payload: input.payload,
      status: OutboxStatus.PENDING,
      retry_count: 0,
      created_at: new Date(),
      published_at: null,
      error_message: null,
    });

    return this.outboxRepo.save(event);
  }

  /**
   * Tra cứu danh sách sự kiện đang chờ publish (PENDING và retry_count < 5)
   */
  async findPendingEvents(limit = 50): Promise<OutboxEvent[]> {
    if (!this.outboxRepo) return [];

    return this.outboxRepo.find({
      where: {
        status: OutboxStatus.PENDING,
        retry_count: LessThan(5),
      },
      order: {
        created_at: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Đánh dấu sự kiện đã được publish thành công sang Message Broker
   */
  async markAsPublished(id: string): Promise<void> {
    if (!this.outboxRepo) return;

    await this.outboxRepo.update(id, {
      status: OutboxStatus.PUBLISHED,
      published_at: new Date(),
      error_message: null,
    });
  }

  /**
   * Đánh dấu sự kiện publish thất bại, tăng retry_count
   */
  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    if (!this.outboxRepo) return;

    const event = await this.outboxRepo.findOne({ where: { id } });
    if (!event) return;

    const newRetryCount = event.retry_count + 1;
    const newStatus = newRetryCount >= 5 ? OutboxStatus.FAILED : OutboxStatus.PENDING;

    await this.outboxRepo.update(id, {
      retry_count: newRetryCount,
      status: newStatus,
      error_message: errorMessage,
    });

    if (newStatus === OutboxStatus.FAILED) {
      this.logger.error(`Outbox event ${id} reached max retries (5) and marked as FAILED: ${errorMessage}`);
    }
  }
}
