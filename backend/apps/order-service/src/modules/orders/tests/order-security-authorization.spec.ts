/**
 * @file order-security-authorization.spec.ts
 * @description Unit tests for Order Service Security & BOLA/IDOR Authorization Controls
 * @traceability
 *   - Plan: docs/plans/platform/security-hardening-pre-deployment-patch.md
 *   - Issues: #101 (Pre-Deployment Security Hardening)
 *   - Scenarios: Happy Path, Edge Cases, Error & Security Rejection Flow
 *   - Use Cases: GetOrderUseCase, UpdateOrderStatusUseCase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import type { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import type { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import type { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import type { SqsService } from '@/common/messaging/sqs.service.js';
import type { SnsService } from '@/common/messaging/sns.service.js';
import type { ConfigService } from '@nestjs/config';

describe('Order Service Security & Authorization Suite', () => {
  const customerIdA = '11111111-1111-1111-1111-111111111111';
  const customerIdB = '22222222-2222-2222-2222-222222222222';
  const driverId = '33333333-3333-3333-3333-333333333333';
  const adminId = '99999999-9999-9999-9999-999999999999';
  const orderId = '44444444-4444-4444-4444-444444444444';

  const mockInflightOrder = {
    id: orderId,
    customer_id: customerIdA,
    restaurant_id: '55555555-5555-5555-5555-555555555555',
    driver_id: driverId,
    total_amount: '150000',
    status: OrderStatus.PENDING,
    delivery_address: '123 Nguyen Hue, Quan 1, TP HCM',
    created_at: new Date().toISOString(),
    items: [],
  };

  let getOrderUseCase: GetOrderUseCase;
  let updateOrderStatusUseCase: UpdateOrderStatusUseCase;
  let mockRedisRepo: {
    getInflightOrder: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    setTtl: ReturnType<typeof vi.fn>;
  };
  let mockReadRepo: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockWriteRepo: {
    save: ReturnType<typeof vi.fn>;
    persistCompletedOrder: ReturnType<typeof vi.fn>;
  };
  let mockSqsService: {
    publishEvent: ReturnType<typeof vi.fn>;
  };
  let mockSnsService: {
    publishEvent: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    getOrThrow: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRedisRepo = {
      getInflightOrder: vi.fn().mockResolvedValue({ ...mockInflightOrder }),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      setTtl: vi.fn().mockResolvedValue(undefined),
    };
    mockReadRepo = {
      findById: vi.fn().mockResolvedValue({ ...mockInflightOrder }),
    };
    mockWriteRepo = {
      save: vi.fn().mockImplementation(async (order) => order),
      persistCompletedOrder: vi.fn().mockImplementation(async (order) => order),
    };
    mockSqsService = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
    };
    mockSnsService = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
    };
    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue('http://localhost:3000'),
    };

    getOrderUseCase = new GetOrderUseCase(
      mockRedisRepo as unknown as OrderRedisRepository,
      mockReadRepo as unknown as OrderReadRepository,
      mockConfigService as unknown as ConfigService,
    );

    updateOrderStatusUseCase = new UpdateOrderStatusUseCase(
      mockRedisRepo as unknown as OrderRedisRepository,
      mockReadRepo as unknown as OrderReadRepository,
      mockWriteRepo as unknown as OrderWriteRepository,
      mockSqsService as unknown as SqsService,
      mockSnsService as unknown as SnsService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('Branch 1: Happy Path (Chính sách truy cập hợp lệ)', () => {
    it('HP-01: Khách hàng tạo đơn được phép truy cập xem chi tiết đơn hàng của mình', async () => {
      const order = await getOrderUseCase.execute({
        orderId,
        user: { id: customerIdA, email: 'customerA@test.com', role: 'CUSTOMER' },
      });
      expect(order).toBeDefined();
      expect(order.id).toBe(orderId);
      expect(order.customer_id).toBe(customerIdA);
    });

    it('HP-02: Tài xế được gán đơn được phép truy cập xem chi tiết đơn hàng', async () => {
      const order = await getOrderUseCase.execute({
        orderId,
        user: { id: driverId, email: 'driver@test.com', role: 'DRIVER' },
      });
      expect(order).toBeDefined();
      expect(order.id).toBe(orderId);
    });

    it('HP-03: Quản trị viên (Admin) được phép xem bất kỳ đơn hàng nào trong hệ thống', async () => {
      const order = await getOrderUseCase.execute({
        orderId,
        user: { id: adminId, email: 'admin@test.com', role: 'ADMIN' },
      });
      expect(order).toBeDefined();
      expect(order.id).toBe(orderId);
    });

    it('HP-04: Khách hàng được phép hủy đơn hàng của chính mình khi đơn đang ở trạng thái PENDING', async () => {
      const result = await updateOrderStatusUseCase.execute({
        orderId,
        dto: { status: OrderStatus.CANCELLED },
        user: { id: customerIdA, email: 'customerA@test.com', role: 'CUSTOMER' },
        changedBy: customerIdA,
      });
      expect(result).toBeDefined();
      expect(mockRedisRepo.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CANCELLED);
    });
  });

  describe('Branch 2: Edge Cases (Các trường hợp biên & Fallback DB)', () => {
    it('EC-01: Khi đơn hàng không có trong Redis, truy vấn DB và vẫn bảo đảm kiểm tra BOLA', async () => {
      mockRedisRepo.getInflightOrder.mockResolvedValueOnce(null);
      mockReadRepo.findById.mockResolvedValueOnce({
        ...mockInflightOrder,
        customer_id: customerIdA,
      });

      const order = await getOrderUseCase.execute({
        orderId,
        user: { id: customerIdA, email: 'customerA@test.com', role: 'CUSTOMER' },
      });
      expect(order).toBeDefined();
      expect(mockReadRepo.findById).toHaveBeenCalledWith(orderId);
    });

    it('EC-02: Khi đơn hàng không tồn tại cả trong Redis lẫn PostgreSQL, ném NotFoundException', async () => {
      mockRedisRepo.getInflightOrder.mockResolvedValueOnce(null);
      mockReadRepo.findById.mockResolvedValueOnce(null);

      await expect(
        getOrderUseCase.execute({
          orderId: 'non-existing-uuid',
          user: { id: customerIdA, email: 'customerA@test.com', role: 'CUSTOMER' },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Branch 3: Error & Security Rejection Flow (Chặn Tấn Công & Vi Phạm Thẩm Quyền)', () => {
    it('ER-01: Khách hàng B cố tình xem đơn hàng của Khách hàng A -> Bị từ chối ForbiddenException (Chống BOLA)', async () => {
      await expect(
        getOrderUseCase.execute({
          orderId,
          user: { id: customerIdB, email: 'attackerB@test.com', role: 'CUSTOMER' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ER-02: Khách hàng cố tình gửi yêu cầu chuyển trạng thái đơn sang COMPLETED -> Bị từ chối ForbiddenException', async () => {
      await expect(
        updateOrderStatusUseCase.execute({
          orderId,
          dto: { status: OrderStatus.COMPLETED },
          user: { id: customerIdA, email: 'customerA@test.com', role: 'CUSTOMER' },
          changedBy: customerIdA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ER-03: Khách hàng cố tình hủy đơn hàng khi trạng thái không còn là PENDING -> Bị từ chối BadRequestException', async () => {
      mockRedisRepo.getInflightOrder.mockResolvedValueOnce({
        ...mockInflightOrder,
        status: OrderStatus.COOKING,
      });

      await expect(
        updateOrderStatusUseCase.execute({
          orderId,
          dto: { status: OrderStatus.CANCELLED },
          user: { id: customerIdA, email: 'customerA@test.com', role: 'CUSTOMER' },
          changedBy: customerIdA,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ER-04: Khách hàng B cố tình gửi yêu cầu hủy đơn hàng của Khách hàng A -> Bị từ chối ForbiddenException', async () => {
      await expect(
        updateOrderStatusUseCase.execute({
          orderId,
          dto: { status: OrderStatus.CANCELLED },
          user: { id: customerIdB, email: 'attackerB@test.com', role: 'CUSTOMER' },
          changedBy: customerIdB,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
