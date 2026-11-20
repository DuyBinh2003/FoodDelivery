/**
 * @file withdrawal.test.ts
 * @description Unit tests for Partner/Driver Bank Withdrawal & Payout validation and calculation logic
 * @traceability
 *   - Plan: docs/plans/platform/partner-driver-bank-withdrawal-and-payout-engine.md (Issue #31 / #D4, #R5)
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface SupportedBank {
  code: string;
  name: string;
  shortName: string;
  bin: string;
}

export const VIETNAM_BANKS: SupportedBank[] = [
  { code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank', bin: '970436' },
  { code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank', bin: '970407' },
  { code: 'MB', name: 'Ngân hàng TMCP Quân Đội', shortName: 'MBBank', bin: '970422' },
  { code: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank', bin: '970415' },
  { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển VN', shortName: 'BIDV', bin: '970418' },
  { code: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB', bin: '970416' },
  { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank', bin: '970432' },
  { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank', bin: '970423' },
  { code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank', bin: '970403' },
  { code: 'HDB', name: 'Ngân hàng TMCP Phát Triển TP.HCM', shortName: 'HDBank', bin: '970437' },
  { code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB', bin: '970426' },
  { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB', bin: '970448' },
  { code: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', shortName: 'VIB', bin: '970441' },
];

export interface WithdrawalValidationInput {
  amount: number;
  availableBalance: number;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  netAmount?: number;
}

export function validateWithdrawalRequest(input: WithdrawalValidationInput): ValidationResult {
  if (!input.amount || isNaN(input.amount) || input.amount < 50000) {
    return { isValid: false, error: 'Số tiền rút tối thiểu là 50.000 VND' };
  }

  if (input.amount > input.availableBalance) {
    return { isValid: false, error: 'Số dư khả dụng không đủ để thực hiện giao dịch rút tiền' };
  }

  if (!input.bankCode || !VIETNAM_BANKS.some((b) => b.code === input.bankCode)) {
    return { isValid: false, error: 'Ngân hàng thụ hưởng không hợp lệ hoặc chưa được hỗ trợ' };
  }

  const cleanAccNum = input.bankAccountNumber?.trim() || '';
  if (cleanAccNum.length < 6 || cleanAccNum.length > 30 || !/^\d+$/.test(cleanAccNum)) {
    return { isValid: false, error: 'Số tài khoản ngân hàng không hợp lệ (phải từ 6-30 chữ số)' };
  }

  const cleanName = input.bankAccountName?.trim() || '';
  if (cleanName.length < 2) {
    return { isValid: false, error: 'Tên chủ tài khoản không được để trống' };
  }

  const fee = 0; // Miễn phí rút
  const netAmount = input.amount - fee;

  return {
    isValid: true,
    netAmount,
  };
}

describe('Partner & Driver Bank Withdrawal Validation & Payout Engine', () => {
  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('[Happy Path] Validate lệnh rút tiền hợp lệ: Rút 2.000.000 VND về Vietcombank, đủ số dư', () => {
      const res = validateWithdrawalRequest({
        amount: 2000000,
        availableBalance: 5000000,
        bankCode: 'VCB',
        bankAccountNumber: '0071001234567',
        bankAccountName: 'NGUYEN VAN A',
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
      assert.strictEqual(res.netAmount, 2000000);
    });

    it('[Happy Path] Validate danh sách ngân hàng Việt Nam hỗ trợ chuẩn Napas / VietQR', () => {
      assert.ok(VIETNAM_BANKS.length >= 10);
      const vcb = VIETNAM_BANKS.find((b) => b.code === 'VCB');
      assert.ok(vcb);
      assert.strictEqual(vcb.bin, '970436');

      const tcb = VIETNAM_BANKS.find((b) => b.code === 'TCB');
      assert.ok(tcb);
      assert.strictEqual(tcb.bin, '970407');
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('[Edge Case] Rút chính xác hạn mức tối thiểu 50.000 VND -> Hợp lệ', () => {
      const res = validateWithdrawalRequest({
        amount: 50000,
        availableBalance: 100000,
        bankCode: 'MB',
        bankAccountNumber: '0987654321',
        bankAccountName: 'TRAN THI B',
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.netAmount, 50000);
    });

    it('[Edge Case] Rút toàn bộ số dư khả dụng (amount === availableBalance) -> Hợp lệ', () => {
      const res = validateWithdrawalRequest({
        amount: 3500000,
        availableBalance: 3500000,
        bankCode: 'BIDV',
        bankAccountNumber: '1234567890',
        bankAccountName: 'LE HOANG C',
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.netAmount, 3500000);
    });

    it('[Edge Case] Rút dưới hạn mức tối thiểu (49.999 VND) -> Báo lỗi', () => {
      const res = validateWithdrawalRequest({
        amount: 49999,
        availableBalance: 500000,
        bankCode: 'VCB',
        bankAccountNumber: '1234567890',
        bankAccountName: 'NGUYEN VAN A',
      });

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.error, 'Số tiền rút tối thiểu là 50.000 VND');
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Lỗi Nhập Liệu)', () => {
    it('[Error Flow] Rút quá số dư khả dụng -> Báo lỗi số dư không đủ', () => {
      const res = validateWithdrawalRequest({
        amount: 10000000,
        availableBalance: 2000000,
        bankCode: 'TCB',
        bankAccountNumber: '19034567891011',
        bankAccountName: 'PHAM QUOC D',
      });

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.error, 'Số dư khả dụng không đủ để thực hiện giao dịch rút tiền');
    });

    it('[Error Flow] Mã ngân hàng không tồn tại trong hệ thống -> Báo lỗi', () => {
      const res = validateWithdrawalRequest({
        amount: 100000,
        availableBalance: 500000,
        bankCode: 'FAKE_BANK',
        bankAccountNumber: '1234567890',
        bankAccountName: 'NGUYEN VAN A',
      });

      assert.strictEqual(res.isValid, false);
      assert.match(res.error || '', /Ngân hàng thụ hưởng không hợp lệ/);
    });

    it('[Error Flow] Số tài khoản ngân hàng quá ngắn hoặc chứa ký tự đặc biệt -> Báo lỗi', () => {
      const shortRes = validateWithdrawalRequest({
        amount: 100000,
        availableBalance: 500000,
        bankCode: 'VCB',
        bankAccountNumber: '123',
        bankAccountName: 'NGUYEN VAN A',
      });
      assert.strictEqual(shortRes.isValid, false);

      const alphaRes = validateWithdrawalRequest({
        amount: 100000,
        availableBalance: 500000,
        bankCode: 'VCB',
        bankAccountNumber: '1234ABC99',
        bankAccountName: 'NGUYEN VAN A',
      });
      assert.strictEqual(alphaRes.isValid, false);
    });

    it('[Error Flow] Tên chủ tài khoản rỗng -> Báo lỗi', () => {
      const res = validateWithdrawalRequest({
        amount: 100000,
        availableBalance: 500000,
        bankCode: 'VCB',
        bankAccountNumber: '1234567890',
        bankAccountName: '   ',
      });

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.error, 'Tên chủ tài khoản không được để trống');
    });
  });
});
