/**
 * @file rate-limit.service.spec.ts
 * @description Unit tests for RateLimitService implementing sliding minute window rate limiting via Redis
 * @traceability
 *   - Plan: docs/plans/platform/ai-chatbox-rag-gemini.md # Section 10
 *   - Doc: docs/plans/platform/ai-chatbox-rag-gemini.md
 *   - Use Case: AI Chat Rate Limiting (20 msg/min)
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from '@/modules/chat/services/rate-limit.service.js';
import type { ConfigService } from '@nestjs/config';
import type { RedisClientType } from 'redis';

describe('RateLimitService - Redis Rate Limiter Suite', () => {
  let rateLimitService: RateLimitService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockRedisClient: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    isOpen: boolean;
  };

  const sampleUserId = 'user-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'ai.rateLimitPerMinute') return 20;
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        return undefined;
      }),
    };

    mockRedisClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
      isOpen: true,
    };

    rateLimitService = new RateLimitService(mockConfigService as unknown as ConfigService);
    rateLimitService.setClient(mockRedisClient as unknown as RedisClientType);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================
  // 1. HAPPY PATH (TC-HP-01, TC-HP-02, TC-HP-03)
  // ==========================================
  describe('Happy Path', () => {
    it('TC-HP-01: Allows first request in minute window and sets 65s expiration TTL on the key', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      await expect(rateLimitService.checkRateLimit(sampleUserId)).resolves.not.toThrow();

      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^ai:ratelimit:${sampleUserId}:\\d+$`)),
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^ai:ratelimit:${sampleUserId}:\\d+$`)),
        65,
      );
    });

    it('TC-HP-02: Allows consecutive requests under rate limit without re-invoking expire', async () => {
      mockRedisClient.incr.mockResolvedValue(5);

      await expect(rateLimitService.checkRateLimit(sampleUserId)).resolves.not.toThrow();

      expect(mockRedisClient.incr).toHaveBeenCalled();
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('TC-HP-03: Allows request when count is exactly equal to the configured limit (20th request)', async () => {
      mockRedisClient.incr.mockResolvedValue(20);

      await expect(rateLimitService.checkRateLimit(sampleUserId)).resolves.not.toThrow();

      expect(mockRedisClient.incr).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. EDGE CASES (TC-EC-01, TC-EC-02, TC-EC-03)
  // ==========================================
  describe('Edge Cases', () => {
    it('TC-EC-01: Gracefully allows request when Redis client is not connected (fail-open)', async () => {
      const disconnectedService = new RateLimitService(mockConfigService as unknown as ConfigService);
      // Not calling setClient or onModuleInit, so client is not connected

      await expect(disconnectedService.checkRateLimit(sampleUserId)).resolves.not.toThrow();
    });

    it('TC-EC-02: Correctly manages lifecycle onModuleInit and onModuleDestroy', async () => {
      const dummyClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isOpen: true,
      };

      const customService = new RateLimitService(mockConfigService as unknown as ConfigService);
      customService.setClient(dummyClient as unknown as RedisClientType);

      await customService.onModuleDestroy();
      expect(dummyClient.disconnect).toHaveBeenCalled();
    });

    it('TC-EC-03: Separates keys across different minute timestamps', async () => {
      vi.useFakeTimers();
      const time1 = new Date(2026, 10, 19, 14, 0, 0); // Minute 0
      vi.setSystemTime(time1);

      mockRedisClient.incr.mockResolvedValue(1);
      await rateLimitService.checkRateLimit(sampleUserId);
      const expectedMinute1 = Math.floor(time1.getTime() / 60000);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(`ai:ratelimit:${sampleUserId}:${expectedMinute1}`);

      // Advance by 1 minute
      const time2 = new Date(2026, 10, 19, 14, 1, 0); // Minute 1
      vi.setSystemTime(time2);
      await rateLimitService.checkRateLimit(sampleUserId);
      const expectedMinute2 = Math.floor(time2.getTime() / 60000);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(`ai:ratelimit:${sampleUserId}:${expectedMinute2}`);
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (TC-ER-01, TC-ER-02)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('TC-ER-01: Throws HttpException with status 429 when request count exceeds limit (21st request)', async () => {
      mockRedisClient.incr.mockResolvedValue(21);

      await expect(rateLimitService.checkRateLimit(sampleUserId)).rejects.toThrow(HttpException);

      try {
        await rateLimitService.checkRateLimit(sampleUserId);
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const resp = httpErr.getResponse() as { message: string };
        expect(resp.message).toContain('vượt quá giới hạn 20 tin nhắn/phút');
      }
    });

    it('TC-ER-02: Fails open (allows request without throwing) when Redis incr throws unexpected error', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis connection lost: ECONNREFUSED'));

      await expect(rateLimitService.checkRateLimit(sampleUserId)).resolves.not.toThrow();
    });
  });
});
