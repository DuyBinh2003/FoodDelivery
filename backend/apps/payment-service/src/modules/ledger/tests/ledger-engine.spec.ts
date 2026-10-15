import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LedgerWriteRepository, PostLedgerTransactionCommand } from '@/modules/ledger/repositories/ledger.write.repository.js';
import { EntryType, AccountCategory, OwnerType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';
import { DataSource } from 'typeorm';

describe('Core Ledger Engine (Double-Entry Bookkeeping)', () => {
  let ledgerWriteRepo: LedgerWriteRepository;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(() => {
    mockQueryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn((_entity, data) => ({ id: 'mock-uuid', ...data })),
        save: vi.fn((entity) => Promise.resolve(entity)),
        createQueryBuilder: vi.fn(),
      },
    };

    mockDataSource = {
      createQueryRunner: vi.fn(() => mockQueryRunner),
    };

    ledgerWriteRepo = new LedgerWriteRepository(mockDataSource as unknown as DataSource);
  });

  it('should throw BadRequestException when transaction has fewer than 2 entries', async () => {
    const command: PostLedgerTransactionCommand = {
      transactionCode: 'TXN-001',
      referenceType: ReferenceType.ORDER_SETTLEMENT,
      referenceId: 'order-1',
      description: 'Single entry invalid transaction',
      idempotencyKey: 'idemp-1',
      entries: [
        {
          walletAccountId: 'wallet-1',
          entryType: EntryType.DEBIT,
          amount: '100000',
        },
      ],
    };

    await expect(ledgerWriteRepo.postJournalTransaction(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when Total DEBIT does not match Total CREDIT', async () => {
    const command: PostLedgerTransactionCommand = {
      transactionCode: 'TXN-002',
      referenceType: ReferenceType.ORDER_SETTLEMENT,
      referenceId: 'order-1',
      description: 'Unbalanced transaction',
      idempotencyKey: 'idemp-2',
      entries: [
        {
          walletAccountId: 'wallet-1',
          entryType: EntryType.DEBIT,
          amount: '200000', // Debit 200k
        },
        {
          walletAccountId: 'wallet-2',
          entryType: EntryType.CREDIT,
          amount: '150000', // Credit only 150k (Violates Double-Entry)
        },
      ],
    };

    await expect(ledgerWriteRepo.postJournalTransaction(command)).rejects.toThrow(
      /Double-entry invariant violated/,
    );
  });

  it('should throw BadRequestException if amount is negative or zero', async () => {
    const command: PostLedgerTransactionCommand = {
      transactionCode: 'TXN-003',
      referenceType: ReferenceType.WALLET_TOPUP,
      referenceId: 'topup-1',
      description: 'Zero amount transaction',
      idempotencyKey: 'idemp-3',
      entries: [
        {
          walletAccountId: 'wallet-1',
          entryType: EntryType.DEBIT,
          amount: '0',
        },
        {
          walletAccountId: 'wallet-2',
          entryType: EntryType.CREDIT,
          amount: '0',
        },
      ],
    };

    await expect(ledgerWriteRepo.postJournalTransaction(command)).rejects.toThrow(
      /strictly positive/,
    );
  });

  it('should successfully post a balanced transaction with Total DEBIT == Total CREDIT', async () => {
    const wallet1 = {
      id: 'wallet-asset-id',
      owner_id: 'platform-id',
      owner_type: OwnerType.PLATFORM,
      account_category: AccountCategory.ASSET,
      currency: 'VND',
    };
    const wallet2 = {
      id: 'wallet-customer-id',
      owner_id: 'customer-id',
      owner_type: OwnerType.CUSTOMER,
      account_category: AccountCategory.LIABILITY,
      currency: 'VND',
    };

    mockQueryRunner.manager.findOne
      .mockResolvedValueOnce(null) // idempotency key not found
      .mockResolvedValueOnce(null) // transaction code not duplicate
      .mockResolvedValueOnce(wallet1) // first wallet account
      .mockResolvedValueOnce(wallet2); // second wallet account

    const balance1 = {
      id: 'bal-1',
      wallet_account_id: 'wallet-asset-id',
      available_balance: '1000000',
      version: '1',
    };
    const balance2 = {
      id: 'bal-2',
      wallet_account_id: 'wallet-customer-id',
      available_balance: '0',
      version: '1',
    };

    mockQueryRunner.manager.createQueryBuilder
      .mockReturnValueOnce({
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(balance1),
      })
      .mockReturnValueOnce({
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(balance2),
      });

    const command: PostLedgerTransactionCommand = {
      transactionCode: 'TXN-BALANCED-001',
      referenceType: ReferenceType.WALLET_TOPUP,
      referenceId: 'ref-123',
      description: 'Topup 500,000 VND',
      idempotencyKey: 'idemp-topup-1',
      entries: [
        {
          walletAccountId: 'wallet-asset-id',
          entryType: EntryType.DEBIT,
          amount: '500000',
        },
        {
          walletAccountId: 'wallet-customer-id',
          entryType: EntryType.CREDIT,
          amount: '500000',
        },
      ],
    };

    const result = await ledgerWriteRepo.postJournalTransaction(command);

    expect(result.transaction).toBeDefined();
    expect(result.entries.length).toBe(2);
    expect(result.entries[0].balance_after).toBe('1500000'); // Asset + 500k
    expect(result.entries[1].balance_after).toBe('500000'); // Liability + 500k
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should reject transaction when customer wallet balance becomes negative', async () => {
    const customerWallet = {
      id: 'cust-wallet-id',
      owner_id: 'cust-id',
      owner_type: OwnerType.CUSTOMER,
      account_category: AccountCategory.LIABILITY,
      currency: 'VND',
    };

    mockQueryRunner.manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(customerWallet);

    const customerBalance = {
      id: 'bal-cust',
      wallet_account_id: 'cust-wallet-id',
      available_balance: '20000', // Only 20k available
      version: '1',
    };

    mockQueryRunner.manager.createQueryBuilder.mockReturnValueOnce({
      setLock: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(customerBalance),
    });

    const command: PostLedgerTransactionCommand = {
      transactionCode: 'TXN-PAY-001',
      referenceType: ReferenceType.ORDER_SETTLEMENT,
      referenceId: 'order-101',
      description: 'Order payment 100k',
      idempotencyKey: 'idemp-pay-1',
      entries: [
        {
          walletAccountId: 'cust-wallet-id',
          entryType: EntryType.DEBIT, // Debit liability decreases balance
          amount: '100000', // 20k - 100k = -80k
        },
        {
          walletAccountId: 'rest-wallet-id',
          entryType: EntryType.CREDIT,
          amount: '100000',
        },
      ],
    };

    await expect(ledgerWriteRepo.postJournalTransaction(command)).rejects.toThrow(
      /Insufficient customer wallet balance/,
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should allow driver wallet to become negative for COD orders and flag driver as inactive', async () => {
    const driverWallet = {
      id: 'driver-wallet-id',
      owner_id: 'driver-123',
      owner_type: OwnerType.DRIVER,
      account_category: AccountCategory.LIABILITY,
      currency: 'VND',
    };
    const platformRevenue = {
      id: 'platform-revenue-id',
      owner_id: 'platform-sys',
      owner_type: OwnerType.PLATFORM,
      account_category: AccountCategory.REVENUE,
      currency: 'VND',
    };

    mockQueryRunner.manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(driverWallet)
      .mockResolvedValueOnce(platformRevenue);

    const driverBalance = {
      id: 'bal-driver',
      wallet_account_id: 'driver-wallet-id',
      available_balance: '30000', // 30k balance
      version: '1',
    };
    const platformBalance = {
      id: 'bal-plat',
      wallet_account_id: 'platform-revenue-id',
      available_balance: '0',
      version: '1',
    };

    mockQueryRunner.manager.createQueryBuilder
      .mockReturnValueOnce({
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(driverBalance),
      })
      .mockReturnValueOnce({
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(platformBalance),
      });

    const command: PostLedgerTransactionCommand = {
      transactionCode: 'TXN-COD-DEDUCT-001',
      referenceType: ReferenceType.COD_DEDUCTION,
      referenceId: 'order-cod-1',
      description: 'COD deduction of 50k from driver with 30k balance',
      idempotencyKey: 'idemp-cod-1',
      entries: [
        {
          walletAccountId: 'driver-wallet-id',
          entryType: EntryType.DEBIT,
          amount: '50000', // 30k - 50k = -20k
        },
        {
          walletAccountId: 'platform-revenue-id',
          entryType: EntryType.CREDIT,
          amount: '50000',
        },
      ],
    };

    const result = await ledgerWriteRepo.postJournalTransaction(command);

    // Negative balance allowed for driver
    expect(result.entries[0].balance_after).toBe('-20000');
    // Driver flagged as inactive warning
    expect(result.driverInactiveWarnings.length).toBe(1);
    expect(result.driverInactiveWarnings[0].driverId).toBe('driver-123');
    expect(result.driverInactiveWarnings[0].currentBalance).toBe('-20000');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });
});
