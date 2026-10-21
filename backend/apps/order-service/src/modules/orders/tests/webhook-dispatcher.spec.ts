/**
 * @file webhook-dispatcher.spec.ts
 * @description Unit tests for Webhook Dispatcher Service & n8n Automation Workflows
 * @traceability
 * - Implementation Plan: docs/plans/platform/ai-assistant-notification-workflows.md
 * - GitHub Issue: #86
 * - Test Coverage: Happy Path, Edge Cases, Error & Retry Flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WebhookDispatcherService } from '@/modules/orders/services/webhook-dispatcher.service.js';
import { WebhookSubscription } from '@/modules/orders/entities/webhook-subscription.entity.js';
import { WebhookDeliveryLog, WebhookDeliveryStatus } from '@/modules/orders/entities/webhook-delivery-log.entity.js';
import { CreateWebhookSubscriptionDto } from '@/modules/orders/dto/create-webhook-subscription.dto.js';
import { DispatchWebhookDto } from '@/modules/orders/dto/dispatch-webhook.dto.js';

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  let mockSubscriptionRepo: Partial<Repository<WebhookSubscription>>;
  let mockDeliveryLogRepo: Partial<Repository<WebhookDeliveryLog>>;

  const dummySubscription: WebhookSubscription = {
    id: 'sub-uuid-123',
    target_name: 'n8n Order Workflow',
    target_url: 'https://n8n.example.com/webhook/order-events',
    subscribed_events: ['order.created', 'order.cancelled'],
    secret_key: 'test-secret-key-32-chars-length!',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    mockSubscriptionRepo = {
      create: vi.fn().mockImplementation((data) => ({ id: 'new-sub-id', ...data })),
      save: vi.fn().mockImplementation((sub) => Promise.resolve(sub)),
      find: vi.fn().mockResolvedValue([dummySubscription]),
      findOne: vi.fn().mockResolvedValue(dummySubscription),
    };

    mockDeliveryLogRepo = {
      create: vi.fn().mockImplementation((data) => ({ id: 'log-uuid-999', ...data })),
      save: vi.fn().mockImplementation((log) => Promise.resolve(log)),
    };

    service = new WebhookDispatcherService(
      mockSubscriptionRepo as Repository<WebhookSubscription>,
      mockDeliveryLogRepo as Repository<WebhookDeliveryLog>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Branch 1: Happy Path', () => {
    it('should compute valid HMAC-SHA256 signature and verify it successfully', () => {
      const payload = { orderId: 'ord-100', totalAmount: 150000, status: 'CREATED' };
      const secret = 'super-secret-key';

      const signature = service.computeSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(service.verifySignature(payload, secret, signature)).toBe(true);
    });

    it('should create new webhook subscription with generated secret key if not provided', async () => {
      const dto: CreateWebhookSubscriptionDto = {
        targetName: 'Telegram Alert n8n',
        targetUrl: 'https://n8n.example.com/webhook/telegram',
        subscribedEvents: ['order.created'],
      };

      const result = await service.createSubscription(dto);

      expect(result.target_name).toBe(dto.targetName);
      expect(result.target_url).toBe(dto.targetUrl);
      expect(result.secret_key).toBeDefined();
      expect(result.secret_key.length).toBeGreaterThan(16);
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
    });

    it('should dispatch event successfully to matched subscriptions and save SUCCESS log', async () => {
      const dispatchDto: DispatchWebhookDto = {
        eventType: 'order.created',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        payload: { orderId: 'ord-123', totalAmount: 75000 },
      };

      // Mock successful fetch
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue('{"received":true}'),
        }),
      );

      const results = await service.dispatch(dispatchDto);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(WebhookDeliveryStatus.SUCCESS);
      expect(results[0].httpStatusCode).toBe(200);
      expect(results[0].attempts).toBe(1);
      expect(mockDeliveryLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WebhookDeliveryStatus.SUCCESS,
          http_status_code: 200,
          attempt_count: 1,
        }),
      );
    });
  });

  describe('Branch 2: Edge Cases & Retry Logic', () => {
    it('should retry with backoff and succeed on the second attempt when first attempt fails with 500', async () => {
      const dispatchDto: DispatchWebhookDto = {
        eventType: 'order.created',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        payload: { orderId: 'ord-456' },
      };

      // Mock attempt 1 failure (500) and attempt 2 success (200)
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue('Internal Server Error'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue('OK'),
        });

      vi.stubGlobal('fetch', mockFetch);

      const results = await service.dispatch(dispatchDto);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(WebhookDeliveryStatus.SUCCESS);
      expect(results[0].attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should correctly sign and verify payloads containing Vietnamese accented Unicode characters', () => {
      const payload = {
        message: 'Đơn hàng bánh mì chả lụa và trà sữa trân châu đường đen',
        restaurant: 'Tiệm Bánh Mì Cô Điệp - Quận 1',
      };
      const secret = 'vietnamese-secret-key';

      const sig = service.computeSignature(payload, secret);
      expect(service.verifySignature(payload, secret, sig)).toBe(true);
    });

    it('should return empty results gracefully when no active subscription subscribes to the event', async () => {
      const dispatchDto: DispatchWebhookDto = {
        eventType: 'unregistered.event.type',
        eventId: '550e8400-e29b-41d4-a716-446655440002',
        payload: {},
      };

      const results = await service.dispatch(dispatchDto);

      expect(results).toEqual([]);
      expect(mockDeliveryLogRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Branch 3: Error & Failure Flow', () => {
    it('should fail verification when signature is tampered or secret is wrong', () => {
      const payload = { amount: 10000 };
      const secret = 'correct-secret';
      const signature = service.computeSignature(payload, secret);

      // Wrong signature
      expect(service.verifySignature(payload, secret, 'sha256=invalidhash1234567890')).toBe(false);
      // Malformed signature without sha256= prefix
      expect(service.verifySignature(payload, secret, 'invalid-format')).toBe(false);
      // Wrong secret
      expect(service.verifySignature(payload, 'wrong-secret', signature)).toBe(false);
    });

    it('should mark delivery log as FAILED after exhausting all 3 retry attempts', async () => {
      const dispatchDto: DispatchWebhookDto = {
        eventType: 'order.created',
        eventId: '550e8400-e29b-41d4-a716-446655440003',
        payload: { orderId: 'ord-fail' },
      };

      // Mock all attempts failing with 503
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          text: vi.fn().mockResolvedValue('Service Unavailable'),
        }),
      );

      const results = await service.dispatch(dispatchDto);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(WebhookDeliveryStatus.FAILED);
      expect(results[0].attempts).toBe(3);
      expect(mockDeliveryLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WebhookDeliveryStatus.FAILED,
          http_status_code: 503,
          attempt_count: 3,
        }),
      );
    });

    it('should throw NotFoundException when target subscription id does not exist', async () => {
      vi.mocked(mockSubscriptionRepo.findOne!).mockResolvedValueOnce(null);

      const dispatchDto: DispatchWebhookDto = {
        eventType: 'order.created',
        eventId: '550e8400-e29b-41d4-a716-446655440004',
        payload: {},
        targetSubscriptionId: 'non-existent-sub-id',
      };

      await expect(service.dispatch(dispatchDto)).rejects.toThrow(NotFoundException);
    });
  });
});
