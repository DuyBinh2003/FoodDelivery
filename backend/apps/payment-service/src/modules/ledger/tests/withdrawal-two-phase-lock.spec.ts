/**
 * [Requirement/Issue: #31 / #D4, #R5]
 * [Target: WithdrawalUseCase - Two-Phase Balance Lock & Settlement Engine]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { WithdrawalUseCase } from '@/modules/ledger/usecases/withdrawal.usecase.js';
import { WithdrawalStatus, AccountCategory, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

describe('WithdrawalUseCase - Two-Phase Balance Lock & Settlement', () => {
  let useCase: WithdrawalUseCase;
  let mockDataSource: any;
  let mockWithdrawalRepo: any;
  let mockWalletWriteRepo: any;
  let mockQueryRunner: any;
  let mockManager: any;

  const mockWallet = {
    id: 'wallet-uuid-1',
    owner_id: 'driver-uuid-1',
    owner_type: 'DRIVER',
    account_category: AccountCategory.LIABILITY,
    account_code: 'WALLET_DRIVER_1',
    currency: 'VND',
    is_deleted: false,
  };

  const initialBalance = {
    id: 'balance-uuid-1',
    wallet_account_id: 'wallet-uuid-1',
    available_balance: '5000000',
    locked_balance: '0',
    currency: 'VND',
    version: '1',
  };

  beforeEach(() => {
    mockManager = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
      create: vi.fn((entityClass, data) => ({ id: 'new-id', ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockQueryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: mockManager,
    };

    mockDataSource = {
      createQueryRunner: vi.fn(() => mockQueryRunner),
    };

    mockWithdrawalRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockWalletWriteRepo = {
      getOrCreateSystemAccount: vi.fn().mockResolvedValue({
        id: 'system-asset-bank-id',
        account_code: 'SYS_ASSET_BANK',
        account_category: AccountCategory.ASSET,
      }),
    };

    useCase = new WithdrawalUseCase(
      mockDataSource,
      mockWithdrawalRepo,
      mockWalletWriteRepo,
    );
  });

  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('[Happy Path] Phase 1 - Hold: Rút 2.000.000 VND thành công, available_balance giảm và locked_balance tăng', async () => {
      // Mock wallet và balance
      mockManager.findOne.mockResolvedValueOnce(mockWallet);

      const currentBalance = { ...initialBalance };
      const qb = {
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(currentBalance),
      };
      mockManager.createQueryBuilder.mockReturnValue(qb);

      const result = await useCase.requestWithdrawal({
        wallet_account_id: 'wallet-uuid-1',
        requester_id: 'driver-uuid-1',
        requester_type: 'DRIVER',
        amount: 2000000,
        bank_code: 'VCB',
        bank_account_number: '1234567890',
        bank_account_name: 'NGUYEN VAN A',
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(currentBalance.available_balance).toBe('3000000');
      expect(currentBalance.locked_balance).toBe('2000000');
      expect(mockManager.save).toHaveBeenCalledWith(currentBalance);
      expect(result.status).toBe(WithdrawalStatus.PENDING);
      expect(result.amount).toBe('2000000');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('[Happy Path] Phase 2 - Settle: Admin duyệt lệnh rút, locked_balance giảm về 0 và hạch toán Sổ cái kép', async () => {
      const pendingWithdrawal = {
        id: 'wd-1',
        wallet_account_id: 'wallet-uuid-1',
        requester_id: 'driver-uuid-1',
        requester_type: 'DRIVER',
        amount: '2000000',
        fee: '0',
        net_amount: '2000000',
        bank_code: 'VCB',
        bank_account_number: '1234567890',
        bank_account_name: 'NGUYEN VAN A',
        status: WithdrawalStatus.PENDING,
        is_deleted: false,
      };

      mockManager.findOne.mockResolvedValueOnce(pendingWithdrawal);

      const lockedBalance = {
        ...initialBalance,
        available_balance: '3000000',
        locked_balance: '2000000',
      };
      const qb = {
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(lockedBalance),
      };
      mockManager.createQueryBuilder.mockReturnValue(qb);

      const approved = await useCase.approveWithdrawal('wd-1', {
        bank_transaction_ref: 'VCB_TXN_987654',
        processed_by: 'admin-uuid-1',
      });

      expect(lockedBalance.locked_balance).toBe('0');
      expect(approved.status).toBe(WithdrawalStatus.COMPLETED);
      expect(approved.bank_transaction_ref).toBe('VCB_TXN_987654');

      // Kiểm tra gọi tạo tài khoản SYS_ASSET_BANK
      expect(mockWalletWriteRepo.getOrCreateSystemAccount).toHaveBeenCalledWith(
        'SYS_ASSET_BANK',
        AccountCategory.ASSET,
      );

      // Kiểm tra lưu LedgerTransaction và LedgerEntry
      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reference_type: ReferenceType.WITHDRAWAL,
          reference_id: 'wd-1',
        }),
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('[Edge Case] Rút dưới hạn mức tối thiểu 50.000 VND -> Bị chặn với BadRequestException', async () => {
      await expect(
        useCase.requestWithdrawal({
          wallet_account_id: 'wallet-uuid-1',
          requester_id: 'driver-uuid-1',
          requester_type: 'DRIVER',
          amount: 49000,
          bank_code: 'VCB',
          bank_account_number: '1234567890',
          bank_account_name: 'NGUYEN VAN A',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('[Edge Case] Rút quá số dư khả dụng (Double-Withdrawal Race Condition) -> Bị chặn với lỗi không đủ số dư', async () => {
      mockManager.findOne.mockResolvedValueOnce(mockWallet);

      const currentBalance = {
        ...initialBalance,
        available_balance: '1000000', // Chỉ còn 1 triệu
        locked_balance: '0',
      };
      const qb = {
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(currentBalance),
      };
      mockManager.createQueryBuilder.mockReturnValue(qb);

      await expect(
        useCase.requestWithdrawal({
          wallet_account_id: 'wallet-uuid-1',
          requester_id: 'driver-uuid-1',
          requester_type: 'DRIVER',
          amount: 2000000, // Yêu cầu rút 2 triệu
          bank_code: 'VCB',
          bank_account_number: '1234567890',
          bank_account_name: 'NGUYEN VAN A',
        }),
      ).rejects.toThrow(/Số dư khả dụng không đủ/);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Hoàn Tiền)', () => {
    it('[Error Flow] Admin từ chối lệnh rút tiền -> Hoàn tiền từ locked_balance về available_balance', async () => {
      const pendingWithdrawal = {
        id: 'wd-2',
        wallet_account_id: 'wallet-uuid-1',
        requester_id: 'driver-uuid-1',
        requester_type: 'DRIVER',
        amount: '1500000',
        fee: '0',
        net_amount: '1500000',
        bank_code: 'MB',
        bank_account_number: '9999999999',
        bank_account_name: 'TRAN THI B',
        status: WithdrawalStatus.PENDING,
        is_deleted: false,
      };

      mockManager.findOne.mockResolvedValueOnce(pendingWithdrawal);

      const balanceState = {
        ...initialBalance,
        available_balance: '3500000',
        locked_balance: '1500000',
      };
      const qb = {
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(balanceState),
      };
      mockManager.createQueryBuilder.mockReturnValue(qb);

      const rejected = await useCase.rejectWithdrawal('wd-2', {
        rejection_reason: 'Số tài khoản ngân hàng không tồn tại',
        processed_by: 'admin-uuid-1',
      });

      // Số tiền được hoàn lại
      expect(balanceState.locked_balance).toBe('0');
      expect(balanceState.available_balance).toBe('5000000');
      expect(rejected.status).toBe(WithdrawalStatus.REJECTED);
      expect(rejected.rejection_reason).toBe('Số tài khoản ngân hàng không tồn tại');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('[Error Flow] Thử duyệt lệnh đã bị REJECTED -> Ném ConflictException', async () => {
      const rejectedWithdrawal = {
        id: 'wd-3',
        status: WithdrawalStatus.REJECTED,
        is_deleted: false,
      };

      mockManager.findOne.mockResolvedValueOnce(rejectedWithdrawal);

      await expect(
        useCase.approveWithdrawal('wd-3', {
          bank_transaction_ref: 'SOME_REF',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('[Error Flow] Không tìm thấy lệnh rút tiền -> Ném NotFoundException', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        useCase.rejectWithdrawal('non-existing-id', {
          rejection_reason: 'Lỗi',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
