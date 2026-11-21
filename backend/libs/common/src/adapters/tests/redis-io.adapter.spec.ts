/**
 * @file redis-io.adapter.spec.ts
 * @description Kiểm thử Socket.IO Redis Adapter mở rộng cụm WebSocket đa pods
 * @trace docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md
 * @plan docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md # Testing Policy Compliance
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { RedisIoAdapter } from '@/common/adapters/redis-io.adapter.js';

vi.mock('redis', () => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn(),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    isOpen: true,
  };
  mockClient.duplicate.mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    isOpen: true,
  });

  return {
    createClient: vi.fn().mockReturnValue(mockClient),
  };
});

vi.mock('@socket.io/redis-adapter', () => {
  return {
    createAdapter: vi.fn().mockReturnValue(() => ({})),
  };
});

describe('RedisIoAdapter [Issue #89 WebSocket Scaling]', () => {
  let adapter: RedisIoAdapter;
  let mockApp: INestApplication;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      getHttpServer: vi.fn().mockReturnValue({}),
    } as unknown as INestApplication;
    adapter = new RedisIoAdapter(mockApp);
  });

  describe('Nhánh 1: Happy Path (Khởi tạo cụm và gắn Adapter)', () => {
    it('[Requirement/Issue #89] [Branch: Happy] Kết nối Redis Pub/Sub và khởi tạo adapterConstructor thành công', async () => {
      await expect(adapter.connectToRedis('redis://localhost:6379')).resolves.toBeUndefined();
      expect(adapter.getPubClient()).toBeDefined();
      expect(adapter.getSubClient()).toBeDefined();
    });

    it('[Requirement/Issue #89] [Branch: Happy] createIOServer áp dụng cấu hình payload 1MB và gắn adapter', async () => {
      await adapter.connectToRedis('redis://localhost:6379');

      const mockServer = {
        adapter: vi.fn(),
      };
      const superCreateIOServer = vi.spyOn(
        Object.getPrototypeOf(RedisIoAdapter.prototype),
        'createIOServer',
      ).mockReturnValue(mockServer);

      const server = adapter.createIOServer(3005, {
        cors: { origin: '*' },
      } as unknown as ServerOptions);

      expect(superCreateIOServer).toHaveBeenCalledWith(
        3005,
        expect.objectContaining({
          maxHttpBufferSize: 1e6,
          transports: ['websocket', 'polling'],
        }),
      );
      expect(mockServer.adapter).toHaveBeenCalled();
      expect(server).toBe(mockServer);
    });
  });

  describe('Nhánh 2: Edge Cases (Xử lý sự kiện lỗi ngầm và đóng kết nối)', () => {
    it('[Requirement/Issue #89] [Branch: Edge] Bắt sự kiện error trên Pub/Sub client mà không crash process', async () => {
      const { createClient } = await import('redis');
      let pubErrorHandler: ((err: Error) => void) | undefined;
      let subErrorHandler: ((err: Error) => void) | undefined;

      (createClient as unknown as Mock).mockReturnValueOnce({
        connect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn((event, handler) => {
          if (event === 'error') pubErrorHandler = handler;
        }),
        duplicate: vi.fn().mockReturnValue({
          connect: vi.fn().mockResolvedValue(undefined),
          on: vi.fn((event, handler) => {
            if (event === 'error') subErrorHandler = handler;
          }),
          quit: vi.fn().mockResolvedValue(undefined),
          isOpen: true,
        }),
        quit: vi.fn().mockResolvedValue(undefined),
        isOpen: true,
      });

      const customAdapter = new RedisIoAdapter(mockApp);
      await customAdapter.connectToRedis('redis://localhost:6379');

      expect(() => {
        pubErrorHandler?.(new Error('Connection reset by peer'));
        subErrorHandler?.(new Error('Timeout reconnecting'));
      }).not.toThrow();
    });

    it('[Requirement/Issue #89] [Branch: Edge] close() giải phóng tài nguyên Redis gracefully', async () => {
      await adapter.connectToRedis('redis://localhost:6379');
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });

  describe('Nhánh 3: Error & Rejection Flow (Ngoại lệ khi không thể kết nối Redis)', () => {
    it('[Requirement/Issue #89] [Branch: Error] Ném ngoại lệ có ngữ cảnh khi connect thất bại', async () => {
      const { createClient } = await import('redis');
      (createClient as unknown as Mock).mockReturnValueOnce({
        connect: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6379')),
        on: vi.fn(),
        duplicate: vi.fn().mockReturnValue({
          connect: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6379')),
          on: vi.fn(),
          quit: vi.fn(),
          isOpen: false,
        }),
        quit: vi.fn(),
        isOpen: false,
      });

      const failingAdapter = new RedisIoAdapter(mockApp);
      await expect(failingAdapter.connectToRedis('redis://bad-host:6379')).rejects.toThrow(
        /Socket.IO Redis Adapter connection failed/,
      );
    });

    it('[Requirement/Issue #89] [Branch: Error] createIOServer ghi nhận cảnh báo khi chưa connectToRedis', () => {
      const mockServer = { adapter: vi.fn() };
      vi.spyOn(
        Object.getPrototypeOf(RedisIoAdapter.prototype),
        'createIOServer',
      ).mockReturnValue(mockServer);

      const uninitAdapter = new RedisIoAdapter(mockApp);
      uninitAdapter.createIOServer(3005);

      expect(mockServer.adapter).not.toHaveBeenCalled();
    });
  });
});
