/**
 * @test-plan file:///c%3A/Users/DELL/.gemini/antigravity-ide/brain/6c87a844-bf88-49da-8c8c-44b663e602f8/admin_portal_expansion_plan.md
 * @business-flow FinTech Core Payment - Driver Trip Platform Commission & Treasury Summary
 * @usecases SettleTripCommissionUseCase, GetPlatformTreasuryUseCase
 *
 * Test Matrix:
 * - 🟢 Happy Path: Settle 10% driver trip fee to platform treasury with valid Double-Entry journal entries
 * - 🟢 Happy Path: Query platform treasury summary and verify revenue source breakdown (restaurant vs driver)
 * - 🟡 Edge Case: Settle trip with custom feeRate and verify calculation
 * - 🔴 Error Flow: Invalid tripAmount (<= 0 or NaN) gracefully rejected without creating corrupt entries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettleTripCommissionUseCase } from '@/modules/ledger/usecases/settle-trip-commission.usecase.js';
import { GetPlatformTreasuryUseCase } from '@/modules/ledger/usecases/get-platform-treasury.usecase.js';
import { AccountCategory, EntryType, OwnerType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

describe('SettleTripCommissionUseCase & GetPlatformTreasuryUseCase', () => {
  let settleTripCommissionUseCase: SettleTripCommissionUseCase;
  let getPlatformTreasuryUseCase: GetPlatformTreasuryUseCase;

  let mockWalletReadRepo: {
    getWalletByOwner: ReturnType<typeof vi.fn>;
    getWalletBalance: ReturnType<typeof vi.fn>;
  };

  let mockWalletWriteRepo: {
    createWalletWithBalance: ReturnType<typeof vi.fn>;
    getOrCreateSystemAccount: ReturnType<typeof vi.fn>;
  };

  let mockLedgerWriteRepo: {
    postJournalTransaction: ReturnType<typeof vi.fn>;
  };

  let mockDataSource: {
    query: ReturnType<typeof vi.fn>;
  };

  const driverId = '11111111-1111-1111-1111-111111111111';
  const orderId = '22222222-2222-2222-2222-222222222222';
  const driverWalletId = '33333333-3333-3333-3333-333333333333';
  const platformRevenueId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    mockWalletReadRepo = {
      getWalletByOwner: vi.fn(),
      getWalletBalance: vi.fn(),
    };

    mockWalletWriteRepo = {
      createWalletWithBalance: vi.fn(),
      getOrCreateSystemAccount: vi.fn(),
    };

    mockLedgerWriteRepo = {
      postJournalTransaction: vi.fn(),
    };

    mockDataSource = {
      query: vi.fn(),
    };

    settleTripCommissionUseCase = new SettleTripCommissionUseCase(
      mockWalletReadRepo as unknown as Parameters<typeof SettleTripCommissionUseCase.prototype.constructor>[0],
      mockWalletWriteRepo as unknown as Parameters<typeof SettleTripCommissionUseCase.prototype.constructor>[1],
      mockLedgerWriteRepo as unknown as Parameters<typeof SettleTripCommissionUseCase.prototype.constructor>[2],
    );

    getPlatformTreasuryUseCase = new GetPlatformTreasuryUseCase(
      mockWalletReadRepo as unknown as Parameters<typeof GetPlatformTreasuryUseCase.prototype.constructor>[0],
      mockWalletWriteRepo as unknown as Parameters<typeof GetPlatformTreasuryUseCase.prototype.constructor>[1],
      mockDataSource as unknown as Parameters<typeof GetPlatformTreasuryUseCase.prototype.constructor>[2],
    );
  });

  describe('SettleTripCommissionUseCase', () => {
    it('🟢 Happy Path: should settle 10% commission from driver trip to SYS_REVENUE_PLATFORM_COMMISSION', async () => {
      mockWalletReadRepo.getWalletByOwner.mockResolvedValue({
        id: driverWalletId,
        owner_id: driverId,
        owner_type: OwnerType.DRIVER,
      });

      mockWalletWriteRepo.getOrCreateSystemAccount.mockResolvedValue({
        id: platformRevenueId,
        account_code: 'SYS_REVENUE_PLATFORM_COMMISSION',
        account_category: AccountCategory.REVENUE,
      });

      mockLedgerWriteRepo.postJournalTransaction.mockResolvedValue({
        transaction: {
          id: 'txn-1',
          transaction_code: 'TRIP-22222222-123456',
          reference_type: ReferenceType.COMMISSION_FEE,
          reference_id: orderId,
        },
        entries: [
          {
            id: 'entry-1',
            wallet_account_id: driverWalletId,
            entry_type: EntryType.DEBIT,
            amount: '3000',
          },
          {
            id: 'entry-2',
            wallet_account_id: platformRevenueId,
            entry_type: EntryType.CREDIT,
            amount: '3000',
          },
        ],
        driverInactiveWarnings: [],
      });

      const result = await settleTripCommissionUseCase.execute({
        orderId,
        driverId,
        tripAmount: 30000,
        feeRate: 10,
      });

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.platformFee).toBe(3000);
      expect(mockLedgerWriteRepo.postJournalTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: ReferenceType.COMMISSION_FEE,
          referenceId: orderId,
          entries: [
            {
              walletAccountId: driverWalletId,
              entryType: EntryType.DEBIT,
              amount: '3000',
            },
            {
              walletAccountId: platformRevenueId,
              entryType: EntryType.CREDIT,
              amount: '3000',
            },
          ],
        }),
      );
    });

    it('🟡 Edge Case: should create driver wallet if not existing prior to settlement', async () => {
      mockWalletReadRepo.getWalletByOwner.mockResolvedValue(null);
      mockWalletWriteRepo.createWalletWithBalance.mockResolvedValue({
        wallet: { id: driverWalletId, owner_id: driverId, owner_type: OwnerType.DRIVER },
        balance: { available_balance: '0' },
      });
      mockWalletWriteRepo.getOrCreateSystemAccount.mockResolvedValue({
        id: platformRevenueId,
        account_code: 'SYS_REVENUE_PLATFORM_COMMISSION',
        account_category: AccountCategory.REVENUE,
      });
      mockLedgerWriteRepo.postJournalTransaction.mockResolvedValue({
        transaction: { id: 'txn-2' },
        entries: [],
        driverInactiveWarnings: [],
      });

      const result = await settleTripCommissionUseCase.execute({
        orderId,
        driverId,
        tripAmount: 50000,
      });

      expect(mockWalletWriteRepo.createWalletWithBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: driverId,
          ownerType: OwnerType.DRIVER,
        }),
      );
      expect(result?.platformFee).toBe(5000);
    });

    it('🔴 Error Flow: should gracefully reject invalid non-numeric or zero trip amount', async () => {
      const resultZero = await settleTripCommissionUseCase.execute({
        orderId,
        driverId,
        tripAmount: 0,
      });
      expect(resultZero).toBeNull();

      const resultNaN = await settleTripCommissionUseCase.execute({
        orderId,
        driverId,
        tripAmount: 'invalid-amount',
      });
      expect(resultNaN).toBeNull();
      expect(mockLedgerWriteRepo.postJournalTransaction).not.toHaveBeenCalled();
    });
  });

  describe('GetPlatformTreasuryUseCase', () => {
    it('🟢 Happy Path: should return platform balance and revenue breakdown from order settlements & trip commissions', async () => {
      mockWalletWriteRepo.getOrCreateSystemAccount.mockResolvedValue({
        id: platformRevenueId,
        account_code: 'SYS_REVENUE_PLATFORM_COMMISSION',
        currency: 'VND',
      });

      mockWalletReadRepo.getWalletBalance.mockResolvedValue({
        wallet_account_id: platformRevenueId,
        available_balance: '25000000',
      });

      // Revenue stats mock query
      mockDataSource.query
        .mockResolvedValueOnce([
          { reference_type: 'ORDER_SETTLEMENT', total_amount: '18000000' },
          { reference_type: 'COMMISSION_FEE', total_amount: '7000000' },
        ])
        // Count query
        .mockResolvedValueOnce([{ count: 42 }])
        // Entries rows query
        .mockResolvedValueOnce([
          {
            id: 'entry-1',
            transaction_code: 'PAY-1111-999',
            reference_type: 'ORDER_SETTLEMENT',
            reference_id: 'order-1',
            description: 'Payment settlement',
            entry_type: 'CREDIT',
            amount: '15000',
            balance_after: '25000000',
            created_at: new Date().toISOString(),
          },
        ]);

      const summary = await getPlatformTreasuryUseCase.execute({ page: 1, limit: 10 });

      expect(summary).toBeDefined();
      expect(summary.available_balance).toBe(25000000);
      expect(summary.restaurant_commission_revenue).toBe(18000000);
      expect(summary.driver_trip_commission_revenue).toBe(7000000);
      expect(summary.total_revenue).toBe(25000000);
      expect(summary.recent_transactions).toHaveLength(1);
      expect(summary.total_transactions_count).toBe(42);
    });
  });
});
