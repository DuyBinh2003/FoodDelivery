/**
 * @file online-payment-gateway-ui.test.ts
 * @description Unit tests for Online Payment Gateway (VNPay & MoMo) UI/UX data handling, validation, and return logic
 * @traceability
 *   - Plan: docs/plans/platform/payment-gateway-webhook.md
 *   - Doc: docs/services/payment-service.md
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface PaymentReturnData {
  provider: 'VNPAY' | 'MOMO' | 'UNKNOWN';
  isSuccess: boolean;
  transactionRef: string;
  gatewayTxnNo?: string;
  amount: number;
  description: string;
  isWalletTopup: boolean;
  errorCode?: string;
}

export function parsePaymentReturnParams(params: Record<string, string | null | undefined>): PaymentReturnData {
  const vnpResponseCode = params.vnp_ResponseCode;
  const momoResultCode = params.resultCode;

  if (vnpResponseCode !== undefined && vnpResponseCode !== null) {
    const isSuccess = vnpResponseCode === '00';
    const rawAmount = params.vnp_Amount ? Number(params.vnp_Amount) / 100 : 0;
    const desc = params.vnp_OrderInfo || 'Thanh toan don hang';
    const isWalletTopup = desc.toLowerCase().includes('wallet') || desc.toLowerCase().includes('nap tien');

    return {
      provider: 'VNPAY',
      isSuccess,
      transactionRef: params.vnp_TxnRef || 'TXN-UNKNOWN',
      gatewayTxnNo: params.vnp_TransactionNo || undefined,
      amount: rawAmount,
      description: desc,
      isWalletTopup,
      errorCode: isSuccess ? undefined : vnpResponseCode,
    };
  }

  if (momoResultCode !== undefined && momoResultCode !== null) {
    const isSuccess = momoResultCode === '0';
    const rawAmount = params.amount ? Number(params.amount) : 0;
    const desc = params.orderInfo || 'Thanh toan MoMo';
    const isWalletTopup = desc.toLowerCase().includes('wallet') || desc.toLowerCase().includes('nap tien');

    return {
      provider: 'MOMO',
      isSuccess,
      transactionRef: params.orderId || 'MOMO-UNKNOWN',
      gatewayTxnNo: params.transId || undefined,
      amount: rawAmount,
      description: desc,
      isWalletTopup,
      errorCode: isSuccess ? undefined : momoResultCode,
    };
  }

  return {
    provider: 'UNKNOWN',
    isSuccess: false,
    transactionRef: 'NONE',
    amount: 0,
    description: '',
    isWalletTopup: false,
    errorCode: 'INVALID_PROVIDER',
  };
}

export function validateGatewayPaymentInput(amount: number, method: 'VNPAY' | 'MOMO'): { isValid: boolean; error?: string } {
  if (amount <= 0) {
    return { isValid: false, error: 'Số tiền thanh toán phải lớn hơn 0 VND' };
  }
  if (amount < 5000) {
    return { isValid: false, error: 'Cổng thanh toán yêu cầu giao dịch tối thiểu là 5.000 VND' };
  }
  if (amount > 50000000) {
    return { isValid: false, error: 'Số tiền thanh toán vượt quá hạn mức tối đa (50.000.000 VND)' };
  }
  if (method !== 'VNPAY' && method !== 'MOMO') {
    return { isValid: false, error: 'Phương thức cổng thanh toán không hợp lệ' };
  }
  return { isValid: true };
}

describe('Online Payment Gateway UI Logic & Return Processing', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Validate thành công input nạp ví 50.000 VND qua VNPAY', () => {
      const res = validateGatewayPaymentInput(50000, 'VNPAY');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it('2. Validate thành công input thanh toán đơn hàng 120.000 VND qua MOMO', () => {
      const res = validateGatewayPaymentInput(120000, 'MOMO');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it('3. Parse thành công callback Return từ VNPay khi giao dịch thành công (code 00)', () => {
      const params = {
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'ORDER-2026-001',
        vnp_Amount: '15000000', // 150.000 VND * 100
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: 'Thanh toan don hang ORDER-2026-001',
        vnp_TransactionNo: '14523689',
      };
      const data = parsePaymentReturnParams(params);
      assert.strictEqual(data.provider, 'VNPAY');
      assert.strictEqual(data.isSuccess, true);
      assert.strictEqual(data.amount, 150000);
      assert.strictEqual(data.transactionRef, 'ORDER-2026-001');
      assert.strictEqual(data.isWalletTopup, false);
      assert.strictEqual(data.errorCode, undefined);
    });

    it('4. Parse thành công callback Return từ MoMo khi giao dịch nạp ví thành công (code 0)', () => {
      const params = {
        resultCode: '0',
        orderId: 'WALLET-TOPUP-9988',
        amount: '200000',
        orderInfo: 'Nap tien vi FoodDelivery wallet',
        transId: '29873412',
      };
      const data = parsePaymentReturnParams(params);
      assert.strictEqual(data.provider, 'MOMO');
      assert.strictEqual(data.isSuccess, true);
      assert.strictEqual(data.amount, 200000);
      assert.strictEqual(data.isWalletTopup, true);
      assert.strictEqual(data.errorCode, undefined);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Kiểm tra mức biên tối thiểu 5.000 VND và mức biên tối đa 50.000.000 VND', () => {
      const minValid = validateGatewayPaymentInput(5000, 'VNPAY');
      assert.strictEqual(minValid.isValid, true);

      const maxValid = validateGatewayPaymentInput(50000000, 'MOMO');
      assert.strictEqual(maxValid.isValid, true);
    });

    it('2. Tham số return page bị thiếu thông tin phụ: Vẫn parse an toàn không crash', () => {
      const params = {
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'ORDER-MINIMAL',
      };
      const data = parsePaymentReturnParams(params);
      assert.strictEqual(data.provider, 'VNPAY');
      assert.strictEqual(data.isSuccess, true);
      assert.strictEqual(data.amount, 0);
      assert.strictEqual(data.gatewayTxnNo, undefined);
      assert.strictEqual(data.transactionRef, 'ORDER-MINIMAL');
    });

    it('3. Không có tham số cổng thanh toán nhận diện: Trả về provider UNKNOWN', () => {
      const data = parsePaymentReturnParams({});
      assert.strictEqual(data.provider, 'UNKNOWN');
      assert.strictEqual(data.isSuccess, false);
      assert.strictEqual(data.errorCode, 'INVALID_PROVIDER');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOWS (TỪ CHỐI & BẢO VỆ)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Từ chối số tiền thanh toán dưới 5.000 VND hoặc âm', () => {
      const negative = validateGatewayPaymentInput(-1000, 'VNPAY');
      assert.strictEqual(negative.isValid, false);
      assert.match(negative.error || '', /lớn hơn 0/);

      const tooSmall = validateGatewayPaymentInput(4999, 'MOMO');
      assert.strictEqual(tooSmall.isValid, false);
      assert.match(tooSmall.error || '', /tối thiểu là 5.000 VND/);
    });

    it('2. Từ chối số tiền vượt quá hạn mức tối đa (50 triệu)', () => {
      const tooLarge = validateGatewayPaymentInput(50000001, 'VNPAY');
      assert.strictEqual(tooLarge.isValid, false);
      assert.match(tooLarge.error || '', /vượt quá hạn mức/);
    });

    it('3. Xử lý chính xác khi khách hàng hủy giao dịch trên VNPay (ResponseCode 24)', () => {
      const params = {
        vnp_ResponseCode: '24',
        vnp_TxnRef: 'ORDER-CANCELLED',
        vnp_Amount: '5000000',
      };
      const data = parsePaymentReturnParams(params);
      assert.strictEqual(data.provider, 'VNPAY');
      assert.strictEqual(data.isSuccess, false);
      assert.strictEqual(data.errorCode, '24');
    });

    it('4. Xử lý chính xác khi MoMo báo lỗi từ chối giao dịch (ResultCode 1006)', () => {
      const params = {
        resultCode: '1006',
        orderId: 'MOMO-REJECTED',
        amount: '100000',
      };
      const data = parsePaymentReturnParams(params);
      assert.strictEqual(data.provider, 'MOMO');
      assert.strictEqual(data.isSuccess, false);
      assert.strictEqual(data.errorCode, '1006');
    });
  });
});
