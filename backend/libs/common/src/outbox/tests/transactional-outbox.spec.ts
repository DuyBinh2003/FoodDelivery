/**
 * @requirement Issue #82 - Distributed Transaction, Saga Orchestration & Idempotency Engine
 * @scenario Transactional Outbox Pattern & Relay Worker Suite (3-Branch Testing)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityManager, Repository } from 'typeorm';
import { TransactionalOutboxService } from '@/common/outbox/transactional-outbox.service.js';
import { OutboxRelayWorker } from '@/common/outbox/outbox-relay.worker.js';
import { OutboxEvent, OutboxStatus } from '@/common/outbox/entities/outbox-event.entity.js';
import { SqsService } from '@/common/messaging/sqs.service.js';

describe('Transactional Outbox Pattern & Relay Worker Suite (#82)', () => {
  let outboxService: TransactionalOutboxService;
  let relayWorker: OutboxRelayWorker;
  let mockOutboxRepo: Partial<Repository<OutboxEvent>>;
  let mockSqsService: Partial<SqsService>;
  let inMemoryEvents: OutboxEvent[];

  beforeEach(() => {
    inMemoryEvents = [];

    mockOutboxRepo = {
      create: vi.fn((dto: Partial<OutboxEvent>) => ({
        id: `evt-${Math.random().toString(36).substring(2, 9)}`,
        status: OutboxStatus.PENDING,
        retry_count: 0,
        error_message: null,
        created_at: new Date(),
        published_at: null,
        ...dto,
      })) as any,
      save: vi.fn(async (event: OutboxEvent) => {
        inMemoryEvents.push(event);
        return event;
      }) as any,
      find: vi.fn(async () => {
        return inMemoryEvents.filter(
          (e) => e.status === OutboxStatus.PENDING && e.retry_count < 5,
        );
      }) as any,
      findOne: vi.fn(async ({ where }: { where: { id: string } }) => {
        return inMemoryEvents.find((e) => e.id === where.id) || null;
      }) as any,
      update: vi.fn(async (id: string, updateData: Partial<OutboxEvent>) => {
        const item = inMemoryEvents.find((e) => e.id === id);
        if (item) {
          Object.assign(item, updateData);
        }
        return { affected: 1, raw: [], generatedMaps: [] };
      }) as any,
    };

    mockSqsService = {
      publishEvent: vi.fn(async () => {}),
    };

    outboxService = new TransactionalOutboxService(mockOutboxRepo as Repository<OutboxEvent>);
    relayWorker = new OutboxRelayWorker(outboxService, mockSqsService as SqsService);
  });

  describe('🟢 Nhánh 1: Happy Path', () => {
    it('HP-01: saveEvent lưu bản ghi trong cùng transaction với status PENDING', async () => {
      /**
       * @requirement Issue #82
       * @scenario Lưu event trong EntityManager của transaction
       * @expected Bản ghi t_outbox được lưu với PENDING và retry_count = 0
       */
      const mockManager = {
        getRepository: vi.fn(() => mockOutboxRepo),
      } as unknown as EntityManager;

      const event = await outboxService.saveEvent(mockManager, {
        aggregateType: 'ORDER',
        aggregateId: 'ord-1234-uuid',
        eventType: 'OrderCreatedDomainEvent',
        payload: { orderId: 'ord-1234-uuid', total: 150000 },
      });

      expect(event).toBeDefined();
      expect(event.aggregate_type).toBe('ORDER');
      expect(event.event_type).toBe('OrderCreatedDomainEvent');
      expect(event.status).toBe(OutboxStatus.PENDING);
      expect(event.retry_count).toBe(0);
      expect(inMemoryEvents.length).toBe(1);
    });

    it('HP-02: OutboxRelayWorker quét batch pending events và publish thành công sang broker', async () => {
      /**
       * @requirement Issue #82
       * @scenario Relay Worker quét và phát tán sự kiện
       * @expected Gọi SqsService publishEvent và cập nhật status = PUBLISHED
       */
      const created = await outboxService.saveEventStandalone({
        aggregateType: 'ORDER',
        aggregateId: 'ord-5555',
        eventType: 'PaymentConfirmedEvent',
        payload: { orderId: 'ord-5555', amount: 50000 },
      });

      const result = await relayWorker.processBatch(10);

      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(mockSqsService.publishEvent).toHaveBeenCalledWith('PaymentConfirmedEvent', {
        orderId: 'ord-5555',
        amount: 50000,
      });

      const updated = inMemoryEvents.find((e) => e.id === created.id);
      expect(updated?.status).toBe(OutboxStatus.PUBLISHED);
      expect(updated?.published_at).toBeDefined();
    });
  });

  describe('🟡 Nhánh 2: Edge Cases', () => {
    it('EC-01: Bảng outbox rỗng -> processBatch trả về 0 processed an toàn', async () => {
      /**
       * @requirement Issue #82
       * @scenario Không có sự kiện pending nào trong bảng
       * @expected Không crash, trả về 0 processed
       */
      const result = await relayWorker.processBatch(50);
      expect(result.totalProcessed).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(mockSqsService.publishEvent).not.toHaveBeenCalled();
    });

    it('EC-02: markAsPublished khi ID không tồn tại -> Bỏ qua an toàn không throw lỗi', async () => {
      /**
       * @requirement Issue #82
       * @scenario Cập nhật id không tồn tại
       * @expected Không văng unhandled rejection
       */
      await expect(outboxService.markAsPublished('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('🔴 Nhánh 3: Error & Rejection Flow', () => {
    it('ER-01: Broker bị lỗi kết nối -> Tăng retry_count và ghi nhận error_message', async () => {
      /**
       * @requirement Issue #82
       * @scenario SQS Broker timeout khi publish
       * @expected Tăng retry_count, ghi log lỗi và giữ status PENDING để retry sau
       */
      vi.mocked(mockSqsService.publishEvent!).mockRejectedValueOnce(
        new Error('SQS Network Connection Timeout'),
      );

      const created = await outboxService.saveEventStandalone({
        aggregateType: 'ORDER',
        aggregateId: 'ord-err-1',
        eventType: 'OrderCreatedEvent',
        payload: { orderId: 'ord-err-1' },
      });

      const result = await relayWorker.processBatch(10);

      expect(result.totalProcessed).toBe(1);
      expect(result.failureCount).toBe(1);

      const failedEvent = inMemoryEvents.find((e) => e.id === created.id);
      expect(failedEvent?.retry_count).toBe(1);
      expect(failedEvent?.status).toBe(OutboxStatus.PENDING);
      expect(failedEvent?.error_message).toContain('SQS Network Connection Timeout');
    });

    it('ER-02: Sự kiện chạm ngưỡng tối đa 5 lần retry -> Đánh dấu trạng thái FAILED (Dead Letter)', async () => {
      /**
       * @requirement Issue #82
       * @scenario Event đã thử 4 lần, lần thứ 5 tiếp tục thất bại
       * @expected Chuyển status = FAILED
       */
      const event = await outboxService.saveEventStandalone({
        aggregateType: 'ORDER',
        aggregateId: 'ord-poison-pill',
        eventType: 'InvalidPayloadEvent',
        payload: {},
      });
      event.retry_count = 4; // Lần thử thứ 4

      await outboxService.markAsFailed(event.id, 'Broker schema validation rejection');

      const poisonEvent = inMemoryEvents.find((e) => e.id === event.id);
      expect(poisonEvent?.retry_count).toBe(5);
      expect(poisonEvent?.status).toBe(OutboxStatus.FAILED);
      expect(poisonEvent?.error_message).toBe('Broker schema validation rejection');
    });
  });
});
