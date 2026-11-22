/**
 * @file payment-security-hardening.spec.ts
 * @description Unit tests for Payment Service Security Hardening (Constant-Time Verification & Simulation Lockout)
 * @traceability
 *   - Plan: docs/plans/platform/security-hardening-pre-deployment-patch.md
 *   - Issues: #101 (Pre-Deployment Security Hardening)
 *   - Scenarios: Happy Path, Edge Cases, Error & Security Rejection Flow
 *   - Use Cases: PaymentGatewayService, PaymentGatewayController
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PaymentGatewayService } from '@/modules/ledger/services/payment-gateway.service.js';
import { PaymentGatewayController } from '@/modules/ledger/payment-gateway.controller.ts';
import type { ProcessGatewayWebhookUseCase } from '@/modules/ledger/usecases/process-gateway-webhook.usecase.js';
import type { ConfigService } from '@nestjs/config';

describe('Payment Service Security Hardening Suite', () => {
  let service: PaymentGatewayService;
  let controller: PaymentGatewayController;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockWebhookUseCase: {
    handleVnPayWebhook: ReturnType<typeof vi.fn>;
    handleMoMoWebhook: ReturnType<typeof vi.fn>;
  };

  const testHashSecret = 'SECRETKEY_VNPAY_SANDBOX_HASH512_DEMO_2026';

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'VNPAY_HASH_SECRET') return testHashSecret;
        if (key === 'MOMO_SECRET_KEY') return 'SECRET_KEY_MOMO_DEMO_SHA256_2026';
        return defaultValue || '';
      }),
    };

    mockWebhookUseCase = {
      handleVnPayWebhook: vi.fn().mockResolvedValue({ RspCode: '00', Message: 'Confirm Success' }),
      handleMoMoWebhook: vi.fn().mockResolvedValue({ resultCode: 0, message: 'Success' }),
    };

    service = new PaymentGatewayService(mockConfigService as unknown as ConfigService);
    controller = new PaymentGatewayController(
      service,
      mockWebhookUseCase as unknown as ProcessGatewayWebhookUseCase,
    );
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('Branch 1: Happy Path (Xác thực chữ ký hợp lệ bằng timingSafeEqual)', () => {
    it('HP-01: Xác thực chữ ký VNPay chính xác trả về true', () => {
      const params: Record<string, string> = {
        vnp_Amount: '10000000',
        vnp_BankCode: 'NCB',
        vnp_Command: 'pay',
        vnp_OrderInfo: 'Thanh toan don hang',
        vnp_ResponseCode: '00',
        vnp_TmnCode: 'FOODDELIVNP',
        vnp_TxnRef: 'TXN_TEST_123',
      };

      const sortedKeys = Object.keys(params).sort();
      const signData = sortedKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
      const hmac = crypto.createHmac('sha512', testHashSecret);
      const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      params['vnp_SecureHash'] = signature;

      const isValid = service.verifyVnPaySignature(params);
      expect(isValid).toBe(true);
    });
  });

  describe('Branch 2: Edge Cases (Chữ ký thiếu, rỗng hoặc độ dài không khớp)', () => {
    it('EC-01: Chữ ký rỗng hoặc thiếu vnp_SecureHash -> Trả về false an toàn', () => {
      const isValid = service.verifyVnPaySignature({ vnp_Amount: '10000' });
      expect(isValid).toBe(false);
    });

    it('EC-02: Chữ ký có độ dài chuỗi không khớp (Buffer mismatch) -> Trả về false không crash', () => {
      const params = {
        vnp_Amount: '10000',
        vnp_SecureHash: 'short_invalid_hash',
      };
      const isValid = service.verifyVnPaySignature(params);
      expect(isValid).toBe(false);
    });
  });

  describe('Branch 3: Error & Security Rejection Flow (Chặn Gian Lận Trên Production)', () => {
    it('ER-01: Gọi simulateWebhook khi NODE_ENV=production -> Ném lỗi NotFoundException 404', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        controller.simulateWebhook({
          gateway: 'VNPAY',
          transactionRef: 'FAKE_TXN_999',
          amount: 5000000,
          walletAccountId: 'wallet-victim-uuid',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ER-02: Khởi tạo PaymentGatewayService trên production thiếu Secret -> Ném Error Fail-Fast', () => {
      process.env.NODE_ENV = 'production';
      const emptyConfigService = {
        get: vi.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new PaymentGatewayService(emptyConfigService as unknown as ConfigService);
      }).toThrow(/Thiếu biến môi trường bí mật thanh toán/);
    });
  });
});
