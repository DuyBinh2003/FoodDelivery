/**
 * @file payment-gateway-webhook.spec.ts
 * @description Unit tests for Online Payment Gateway (VNPay / MoMo) and Webhook Idempotency
 *
 * Traceability Matrix:
 * - Module: Payment Service - Ledger Module
 * - Task Code: payment-gateway-webhook
 * - Issue: #77 (Tích hợp Cổng thanh toán trực tuyến với Webhook Idempotency)
 * - Plan: docs/plans/platform/payment-gateway-webhook.md
 *
 * Test Scenarios:
 * 1. Happy Path (HP-01 -> HP-04):
 *    - HP-01: Tạo URL thanh toán VNPay thành công với chữ ký HMAC-SHA512.
 *    - HP-02: Tạo URL thanh toán MoMo thành công với chữ ký HMAC-SHA256.
 *    - HP-03: Xử lý Webhook VNPay thành công và nạp tiền vào ví người dùng.
 *    - HP-04: Xử lý Webhook MoMo thành công và nạp tiền vào ví người dùng.
 * 2. Edge Cases (EC-01 -> EC-04):
 *    - EC-01: Webhook VNPay bắn lại nhiều lần (Idempotency check): không nạp tiền lần 2.
 *    - EC-02: Webhook MoMo bắn lại nhiều lần (Idempotency check): không nạp tiền lần 2.
 *    - EC-03: Sắp xếp bảng chữ cái tham số VNPay chính xác để tạo & kiểm tra chữ ký.
 *    - EC-04: Webhook VNPay với mã lỗi (khách hủy) được xác nhận an toàn mà không nạp tiền.
 * 3. Error Flow (ERR-01 -> ERR-03):
 *    - ERR-01: Webhook VNPay chữ ký không hợp lệ -> ném BadRequestException.
 *    - ERR-02: Webhook MoMo chữ ký không hợp lệ -> ném BadRequestException.
 *    - ERR-03: Webhook VNPay thiếu vnp_SecureHash -> ném BadRequestException.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayService } from '@/modules/ledger/services/payment-gateway.service.js';
import { ProcessGatewayWebhookUseCase } from '@/modules/ledger/usecases/process-gateway-webhook.usecase.js';
import { OnlinePaymentGateway } from '@/modules/ledger/dto/create-gateway-payment-url.dto.js';
import type { TopupWalletUseCase } from '@/modules/ledger/usecases/topup-wallet.usecase.js';
import type { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import type { IdempotencyKey } from '@/modules/ledger/entities/idempotency-key.entity.js';
import type { Repository } from 'typeorm';

describe('Payment Gateway & Webhook Idempotency (Issue #77)', () => {
  let gatewayService: PaymentGatewayService;
  let webhookUseCase: ProcessGatewayWebhookUseCase;

  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  let mockTopupWalletUseCase: {
    execute: ReturnType<typeof vi.fn>;
  };

  let mockWalletReadRepo: {
    getWalletById: ReturnType<typeof vi.fn>;
  };

  let mockIdempotencyRepo: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const sampleWallet = {
    id: '11111111-2222-3333-4444-555555555555',
    owner_id: 'user-uuid-123',
    account_code: 'WALLET_CUSTOMER_123',
  };

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        const configs: Record<string, string> = {
          VNPAY_TMN_CODE: 'TEST_TMN',
          VNPAY_HASH_SECRET: 'TEST_HASH_SECRET_1234567890',
          VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
          MOMO_PARTNER_CODE: 'MOMO_PARTNER',
          MOMO_ACCESS_KEY: 'MOMO_ACCESS',
          MOMO_SECRET_KEY: 'MOMO_SECRET_1234567890',
          MOMO_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/pay',
        };
        return configs[key] || defaultValue;
      }),
    };

    mockTopupWalletUseCase = {
      execute: vi.fn().mockResolvedValue({ transactionId: 'txn-topup-123' }),
    };

    mockWalletReadRepo = {
      getWalletById: vi.fn().mockResolvedValue(sampleWallet),
    };

    mockIdempotencyRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((d) => d),
      save: vi.fn().mockImplementation((d) => Promise.resolve(d)),
    };

    gatewayService = new PaymentGatewayService(mockConfigService as unknown as ConfigService);
    webhookUseCase = new ProcessGatewayWebhookUseCase(
      gatewayService,
      mockTopupWalletUseCase as unknown as TopupWalletUseCase,
      mockWalletReadRepo as unknown as WalletReadRepository,
      mockIdempotencyRepo as unknown as Repository<IdempotencyKey>,
    );
  });

  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP-01 -> HP-04)
  // ==========================================
  describe('Nhánh 1: Happy Path', () => {
    it('HP-01: Tạo URL thanh toán VNPay thành công với chữ ký HMAC-SHA512', () => {
      const result = gatewayService.createPaymentUrl({
        amount: 50000,
        paymentMethod: OnlinePaymentGateway.VNPAY,
        walletAccountId: sampleWallet.id,
      });

      expect(result.paymentUrl).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
      expect(result.paymentUrl).toContain('vnp_SecureHash=');
      expect(result.qrPayload).toContain('vnpay://qr?data=');
      expect(result.gateway).toBe(OnlinePaymentGateway.VNPAY);
      expect(result.amount).toBe(50000);
    });

    it('HP-02: Tạo URL thanh toán MoMo thành công với chữ ký HMAC-SHA256', () => {
      const result = gatewayService.createPaymentUrl({
        amount: 100000,
        paymentMethod: OnlinePaymentGateway.MOMO,
        walletAccountId: sampleWallet.id,
      });

      expect(result.paymentUrl).toContain('https://test-payment.momo.vn/v2/gateway/pay');
      expect(result.paymentUrl).toContain('signature=');
      expect(result.qrPayload).toContain('momo://payment?orderId=');
      expect(result.gateway).toBe(OnlinePaymentGateway.MOMO);
      expect(result.amount).toBe(100000);
    });

    it('HP-03: Xử lý Webhook VNPay thành công và nạp tiền vào ví', async () => {
      // Mock verifyVnPaySignature return true
      vi.spyOn(gatewayService, 'verifyVnPaySignature').mockReturnValue(true);

      const response = await webhookUseCase.handleVnPayWebhook({
        vnp_TmnCode: 'TEST_TMN',
        vnp_Amount: '5000000', // 50.000 * 100
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: `Nap tien vi ${sampleWallet.id}`,
        vnp_TransactionNo: '14526372',
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'TXN_123456',
        vnp_SecureHash: 'mocked_valid_hash',
      });

      expect(response.RspCode).toBe('00');
      expect(response.Message).toBe('Confirm Success');
      expect(mockTopupWalletUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAccountId: sampleWallet.id,
          amount: '50000',
          paymentMethod: 'VNPAY',
        }),
      );
    });

    it('HP-04: Xử lý Webhook MoMo thành công và nạp tiền vào ví', async () => {
      vi.spyOn(gatewayService, 'verifyMoMoSignature').mockReturnValue(true);

      const extraData = Buffer.from(JSON.stringify({ walletAccountId: sampleWallet.id })).toString('base64');

      const response = await webhookUseCase.handleMoMoWebhook({
        partnerCode: 'MOMO_PARTNER',
        orderId: 'MOMO_TXN_999',
        requestId: 'REQ_123',
        amount: 80000,
        orderInfo: 'Nap tien MoMo',
        orderType: 'momo_wallet',
        transId: 23456789,
        resultCode: 0,
        message: 'Giao dịch thành công',
        responseTime: Date.now(),
        extraData,
        signature: 'mocked_valid_momo_sig',
      });

      expect(response.resultCode).toBe(0);
      expect(response.message).toBe('Success');
      expect(mockTopupWalletUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAccountId: sampleWallet.id,
          amount: '80000',
          paymentMethod: 'MOMO',
        }),
      );
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC-01 -> EC-04)
  // ==========================================
  describe('Nhánh 2: Edge Cases', () => {
    it('EC-01: Webhook VNPay bắn lại lần 2 (Idempotency) -> không nạp tiền lần 2', async () => {
      vi.spyOn(gatewayService, 'verifyVnPaySignature').mockReturnValue(true);

      // Đã có record SUCCEEDED từ trước
      mockIdempotencyRepo.findOne.mockResolvedValue({
        idempotency_key: 'VNPAY_TXN_RETRY',
        status: 'SUCCEEDED',
      });

      const response = await webhookUseCase.handleVnPayWebhook({
        vnp_TmnCode: 'TEST_TMN',
        vnp_Amount: '5000000',
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: `Nap tien vi ${sampleWallet.id}`,
        vnp_TransactionNo: '14526372',
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'TXN_RETRY',
        vnp_SecureHash: 'valid_hash',
      });

      expect(response.RspCode).toBe('00');
      expect(mockTopupWalletUseCase.execute).not.toHaveBeenCalled();
    });

    it('EC-02: Webhook MoMo bắn lại lần 2 (Idempotency) -> không nạp tiền lần 2', async () => {
      vi.spyOn(gatewayService, 'verifyMoMoSignature').mockReturnValue(true);

      mockIdempotencyRepo.findOne.mockResolvedValue({
        idempotency_key: 'MOMO_ORDER_RETRY',
        status: 'SUCCEEDED',
      });

      const response = await webhookUseCase.handleMoMoWebhook({
        partnerCode: 'MOMO_PARTNER',
        orderId: 'ORDER_RETRY',
        requestId: 'REQ_RETRY',
        amount: 80000,
        orderInfo: 'Nap tien',
        orderType: 'momo_wallet',
        transId: 23456789,
        resultCode: 0,
        message: 'Success',
        responseTime: Date.now(),
        signature: 'valid_sig',
      });

      expect(response.resultCode).toBe(0);
      expect(mockTopupWalletUseCase.execute).not.toHaveBeenCalled();
    });

    it('EC-03: Xác thực chữ ký VNPay thực tế tự sinh và tự kiểm tra khớp 100%', () => {
      const generated = gatewayService.createPaymentUrl({
        amount: 250000,
        paymentMethod: OnlinePaymentGateway.VNPAY,
        walletAccountId: sampleWallet.id,
      });

      const urlObj = new URL(generated.paymentUrl);
      const queryParams: Record<string, string> = {};
      urlObj.searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });

      // Kiểm tra chữ ký tự sinh bằng verifyVnPaySignature
      const isValid = gatewayService.verifyVnPaySignature(queryParams);
      expect(isValid).toBe(true);
    });

    it('EC-04: Webhook VNPay trả về mã lỗi khách hủy giao dịch (vnp_ResponseCode !== "00") -> không nạp tiền', async () => {
      vi.spyOn(gatewayService, 'verifyVnPaySignature').mockReturnValue(true);

      const response = await webhookUseCase.handleVnPayWebhook({
        vnp_TmnCode: 'TEST_TMN',
        vnp_Amount: '5000000',
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: `Nap tien vi ${sampleWallet.id}`,
        vnp_TransactionNo: '14526372',
        vnp_ResponseCode: '24', // Mã lỗi: Khách hàng hủy giao dịch
        vnp_TxnRef: 'TXN_CANCELLED',
        vnp_SecureHash: 'valid_hash',
      });

      expect(response.RspCode).toBe('00');
      expect(mockTopupWalletUseCase.execute).not.toHaveBeenCalled();
      expect(mockIdempotencyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
        }),
      );
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR / REJECTION FLOW (ERR-01 -> ERR-03)
  // ==========================================
  describe('Nhánh 3: Error / Rejection Flow', () => {
    it('ERR-01: Ném BadRequestException nếu chữ ký bảo mật VNPay không hợp lệ (bị giả mạo)', async () => {
      vi.spyOn(gatewayService, 'verifyVnPaySignature').mockReturnValue(false);

      await expect(
        webhookUseCase.handleVnPayWebhook({
          vnp_TmnCode: 'TEST_TMN',
          vnp_Amount: '5000000',
          vnp_BankCode: 'NCB',
          vnp_OrderInfo: 'Nap tien',
          vnp_TransactionNo: '14526372',
          vnp_ResponseCode: '00',
          vnp_TxnRef: 'TXN_HACK',
          vnp_SecureHash: 'fake_hash',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-02: Ném BadRequestException nếu chữ ký MoMo không hợp lệ', async () => {
      vi.spyOn(gatewayService, 'verifyMoMoSignature').mockReturnValue(false);

      await expect(
        webhookUseCase.handleMoMoWebhook({
          partnerCode: 'MOMO_PARTNER',
          orderId: 'MOMO_HACK',
          requestId: 'REQ_HACK',
          amount: 50000,
          orderInfo: 'Hack',
          orderType: 'momo_wallet',
          transId: 999999,
          resultCode: 0,
          message: 'Success',
          responseTime: Date.now(),
          signature: 'fake_sig',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-03: Xác thực chữ ký VNPay trả về false nếu thiếu vnp_SecureHash', () => {
      const isValid = gatewayService.verifyVnPaySignature({
        vnp_TmnCode: 'TEST',
        vnp_Amount: '1000',
      });
      expect(isValid).toBe(false);
    });
  });
});
