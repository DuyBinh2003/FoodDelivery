/**
 * @requirement Issue #82 - Distributed Transaction, Saga Orchestration & Idempotency Engine
 * @scenario Order Saga Orchestrator & Compensating Transactions Suite (3-Branch Testing)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OrderSagaOrchestrator,
  OrderSagaStep,
  OrderSagaStatus,
} from '@/modules/orders/services/order-saga-orchestrator.service.js';
import { OrderRedisRepository, InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';
import { RevertVoucherUseCase } from '@/modules/orders/usecases/revert-voucher.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { ConfigService } from '@nestjs/config';

describe('Order Saga Orchestrator & Compensating Transactions Suite (#82)', () => {
  let orchestrator: OrderSagaOrchestrator;
  let mockRedisRepo: Partial<OrderRedisRepository>;
  let mockRevertVoucherUseCase: Partial<RevertVoucherUseCase>;
  let mockConfigService: Partial<ConfigService>;
  let inMemoryInflightOrders: Map<string, InflightOrderData>;

  const sampleOrder: InflightOrderData = {
    id: 'ord-saga-uuid-001',
    customer_id: 'cust-123',
    restaurant_id: 'rest-456',
    driver_id: null,
    status: OrderStatus.PENDING,
    delivery_address: '123 Đường Nguyễn Huệ, Q1',
    note: null,
    payment_method: 'WALLET',
    subtotal: 120000,
    delivery_fee: 15000,
    points_used: 150,
    points_discount: 1500,
    total_amount: 133500,
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    inMemoryInflightOrders = new Map();
    inMemoryInflightOrders.set(sampleOrder.id, { ...sampleOrder });

    mockRedisRepo = {
      getInflightOrder: vi.fn(async (id: string) => inMemoryInflightOrders.get(id) || null),
      updateStatus: vi.fn(async (id: string, status: OrderStatus) => {
        const o = inMemoryInflightOrders.get(id);
        if (o) {
          o.status = status;
          return o;
        }
        return null;
      }),
    };

    mockRevertVoucherUseCase = {
      execute: vi.fn(async () => ({
        reverted: true,
        voucherId: 'vch-freedom-50k',
        refundedDiscount: 50000,
      })),
    };

    mockConfigService = {
      get: vi.fn(() => undefined),
    };

    orchestrator = new OrderSagaOrchestrator(
      mockRedisRepo as OrderRedisRepository,
      mockRevertVoucherUseCase as RevertVoucherUseCase,
      undefined,
      mockConfigService as ConfigService,
    );
  });

  describe('🟢 Nhánh 1: Happy Path', () => {
    it('HP-01: startSaga khởi tạo state ban đầu với bước CREATE_ORDER và status IN_PROGRESS', async () => {
      /**
       * @requirement Issue #82
       * @scenario Bắt đầu chuỗi Saga cho đơn hàng mới
       * @expected Trả về state với currentStep = CREATE_ORDER, status = IN_PROGRESS
       */
      const state = await orchestrator.startSaga(sampleOrder);

      expect(state).toBeDefined();
      expect(state.orderId).toBe(sampleOrder.id);
      expect(state.currentStep).toBe(OrderSagaStep.CREATE_ORDER);
      expect(state.status).toBe(OrderSagaStatus.IN_PROGRESS);
      expect(state.history.length).toBe(1);
      expect(state.history[0].step).toBe(OrderSagaStep.CREATE_ORDER);
    });

    it('HP-02: advanceStep chuyển tiếp tuần tự đến CONFIRM_ORDER -> Status chuyển COMPLETED', async () => {
      /**
       * @requirement Issue #82
       * @scenario Chuyển tiếp các bước trong Saga thành công
       * @expected Cuối cùng status chuyển COMPLETED
       */
      let state = await orchestrator.startSaga(sampleOrder);

      state = await orchestrator.advanceStep(state, OrderSagaStep.DEDUCT_PAYMENT);
      expect(state.currentStep).toBe(OrderSagaStep.DEDUCT_PAYMENT);
      expect(state.status).toBe(OrderSagaStatus.IN_PROGRESS);

      state = await orchestrator.advanceStep(state, OrderSagaStep.DISPATCH_DRIVER);
      expect(state.currentStep).toBe(OrderSagaStep.DISPATCH_DRIVER);

      state = await orchestrator.advanceStep(state, OrderSagaStep.CONFIRM_ORDER);
      expect(state.currentStep).toBe(OrderSagaStep.CONFIRM_ORDER);
      expect(state.status).toBe(OrderSagaStatus.COMPLETED);
      expect(state.history.length).toBe(4);
    });
  });

  describe('🟡 Nhánh 2: Edge Cases (Compensating Transactions)', () => {
    it('EC-01: Không tìm thấy tài xế sau timeout -> Kích hoạt Compensating Saga hoàn tiền, hoàn điểm, revert voucher', async () => {
      /**
       * @requirement Issue #82
       * @scenario Thất bại ở bước DISPATCH_DRIVER (hết thời gian tìm tài xế)
       * @expected Bù trừ hoàn tất: hoàn tiền ví, hoàn điểm loyalty, hoàn voucher, chuyển trạng thái CANCELLED
       */
      const result = await orchestrator.compensate(
        sampleOrder.id,
        OrderSagaStep.DISPATCH_DRIVER,
        'Timeout: Không có tài xế nào nhận chuyến sau 5 phút',
      );

      expect(result.status).toBe(OrderSagaStatus.COMPENSATED);
      expect(result.refundAmount).toBe(133500);
      expect(result.pointsRefunded).toBe(150);
      expect(result.voucherReverted).toBe(true);
      expect(mockRevertVoucherUseCase.execute).toHaveBeenCalledWith(sampleOrder.id);
      expect(mockRedisRepo.updateStatus).toHaveBeenCalledWith(
        sampleOrder.id,
        OrderStatus.CANCELLED,
      );

      expect(result.compensationLog).toContain('Đã hoàn trả 133.500 VND vào ví người dùng');
      expect(result.compensationLog).toContain('Đã hoàn lại 150 điểm thưởng loyalty');
    });

    it('EC-02: Đơn thanh toán tiền mặt (CASH) -> Không hoàn tiền ví khi compensate', async () => {
      /**
       * @requirement Issue #82
       * @scenario Đơn COD thất bại
       * @expected refundAmount = 0, không có log hoàn tiền ví
       */
      const codOrder: InflightOrderData = {
        ...sampleOrder,
        id: 'ord-cod-999',
        payment_method: 'CASH',
        points_used: 0,
      };
      inMemoryInflightOrders.set(codOrder.id, codOrder);

      const result = await orchestrator.compensate(
        codOrder.id,
        OrderSagaStep.CREATE_ORDER,
        'Quán từ chối nhận món',
      );

      expect(result.status).toBe(OrderSagaStatus.COMPENSATED);
      expect(result.refundAmount).toBe(0);
      expect(result.pointsRefunded).toBe(0);
      expect(mockRedisRepo.updateStatus).toHaveBeenCalledWith(
        codOrder.id,
        OrderStatus.CANCELLED,
      );
    });
  });

  describe('🔴 Nhánh 3: Error & Rejection Flow', () => {
    it('ER-01: Không tìm thấy đơn hàng trong Redis cache -> Trả về status FAILED', async () => {
      /**
       * @requirement Issue #82
       * @scenario Compensate đơn không tồn tại
       * @expected Trả về status = FAILED, không crash
       */
      const result = await orchestrator.compensate(
        'non-existing-order-id',
        OrderSagaStep.DISPATCH_DRIVER,
        'Unknown error',
      );

      expect(result.status).toBe(OrderSagaStatus.FAILED);
      expect(result.compensationLog[0]).toContain('Lỗi: Không tìm thấy snapshot đơn');
    });

    it('ER-02: Revert voucher bị ném ngoại lệ -> Vẫn tiếp tục các bước rollback còn lại để bảo toàn tính nhất quán', async () => {
      /**
       * @requirement Issue #82
       * @scenario Revert voucher service gặp lỗi
       * @expected Ghi nhận log lỗi của voucher nhưng vẫn hoàn tiền và hủy đơn an toàn
       */
      vi.mocked(mockRevertVoucherUseCase.execute!).mockRejectedValueOnce(
        new Error('Voucher DB lock failed'),
      );

      const result = await orchestrator.compensate(
        sampleOrder.id,
        OrderSagaStep.DISPATCH_DRIVER,
        'Hủy đơn',
      );

      expect(result.status).toBe(OrderSagaStatus.COMPENSATED);
      expect(result.refundAmount).toBe(133500); // Tiền vẫn được hoàn
      expect(result.voucherReverted).toBe(false);
      expect(mockRedisRepo.updateStatus).toHaveBeenCalledWith(
        sampleOrder.id,
        OrderStatus.CANCELLED,
      );
    });
  });
});
