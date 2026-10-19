import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessPaymentUseCase } from '@/modules/ledger/usecases/process-payment.usecase.js';
import { PaymentMethodType } from '@/modules/ledger/dto/process-payment.dto.js';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let mockWalletReadRepo: any;
  let mockWalletWriteRepo: any;
  let mockLedgerWriteRepo: any;
  let mockPaymentIntentRepo: any;

  beforeEach(() => {
    mockWalletReadRepo = {
      getWalletByOwner: vi.fn(),
      getWalletById: vi.fn(),
    };
    mockWalletWriteRepo = {
      createWalletWithBalance: vi.fn(),
      getOrCreateSystemAccount: vi.fn(),
    };
    mockLedgerWriteRepo = {
      postJournalTransaction: vi.fn(),
    };
    mockPaymentIntentRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: 'mock-intent-id', ...data })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    useCase = new ProcessPaymentUseCase(
      mockWalletReadRepo,
      mockWalletWriteRepo,
      mockLedgerWriteRepo,
      mockPaymentIntentRepo,
    );
  });

  it('should process COD payment by creating a PENDING_COD intent without ledger transaction', async () => {
    mockPaymentIntentRepo.findOne.mockResolvedValue(null);

    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      customerId: '11111111-1111-4111-a111-111111111111',
      restaurantId: '22222222-2222-4222-a222-222222222222',
      amount: '150000',
      paymentMethod: PaymentMethodType.COD,
      idempotencyKey: 'idemp-cod-test',
    });

    expect(result.paymentIntent).toBeDefined();
    expect(result.paymentIntent.status).toBe('PENDING_COD');
    expect(result.paymentIntent.payment_method).toBe('COD');
    expect(result.transaction).toBeNull();
    expect(mockLedgerWriteRepo.postJournalTransaction).not.toHaveBeenCalled();
  });

  it('should process WALLET payment by posting double-entry transaction and returning SUCCEEDED intent', async () => {
    mockPaymentIntentRepo.findOne.mockResolvedValue(null);
    mockWalletReadRepo.getWalletByOwner
      .mockResolvedValueOnce({ id: 'cust-wallet-id', owner_id: 'cust-1' })
      .mockResolvedValueOnce({ id: 'rest-wallet-id', owner_id: 'rest-1' });

    mockWalletWriteRepo.getOrCreateSystemAccount.mockResolvedValue({
      id: 'plat-rev-id',
    });

    mockLedgerWriteRepo.postJournalTransaction.mockResolvedValue({
      transaction: { id: 'txn-1', transaction_code: 'PAY-44444444-123' },
      entries: [{ id: 'entry-1' }, { id: 'entry-2' }, { id: 'entry-3' }],
    });

    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      customerId: '11111111-1111-4111-a111-111111111111',
      restaurantId: '22222222-2222-4222-a222-222222222222',
      amount: '100000',
      paymentMethod: PaymentMethodType.WALLET,
      idempotencyKey: 'idemp-wallet-test',
    });

    expect(result.paymentIntent.status).toBe('SUCCEEDED');
    expect(result.paymentIntent.payment_method).toBe('WALLET');
    expect(result.transaction).toBeDefined();
    expect(mockLedgerWriteRepo.postJournalTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: expect.arrayContaining([
          expect.objectContaining({ walletAccountId: 'cust-wallet-id', amount: '100000' }),
          expect.objectContaining({ walletAccountId: 'rest-wallet-id', amount: '80000' }),
          expect.objectContaining({ walletAccountId: 'plat-rev-id', amount: '20000' }),
        ]),
      }),
    );
  });

  it('should process WALLET payment with distinct subtotal and delivery fee split', async () => {
    mockPaymentIntentRepo.findOne.mockResolvedValue(null);
    mockWalletReadRepo.getWalletByOwner
      .mockResolvedValueOnce({ id: 'cust-wallet-id', owner_id: 'cust-1' })
      .mockResolvedValueOnce({ id: 'rest-wallet-id', owner_id: 'rest-1' });

    mockWalletWriteRepo.getOrCreateSystemAccount.mockResolvedValue({
      id: 'plat-rev-id',
    });

    mockLedgerWriteRepo.postJournalTransaction.mockResolvedValue({
      transaction: { id: 'txn-subtotal', transaction_code: 'PAY-44444444-456' },
      entries: [{ id: 'entry-1' }, { id: 'entry-2' }, { id: 'entry-3' }],
    });

    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      customerId: '11111111-1111-4111-a111-111111111111',
      restaurantId: '22222222-2222-4222-a222-222222222222',
      amount: '65000',
      subtotal: '50000',
      deliveryFee: '15000',
      paymentMethod: PaymentMethodType.WALLET,
      idempotencyKey: 'idemp-subtotal-test',
    });

    expect(result.paymentIntent.status).toBe('SUCCEEDED');
    expect(mockLedgerWriteRepo.postJournalTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: expect.arrayContaining([
          expect.objectContaining({ walletAccountId: 'cust-wallet-id', amount: '65000' }),
          expect.objectContaining({ walletAccountId: 'rest-wallet-id', amount: '40000' }),
          expect.objectContaining({ walletAccountId: 'plat-rev-id', amount: '25000' }),
        ]),
      }),
    );
  });

  it('should return already processed intent if duplicate idempotency key is received', async () => {
    const existing = { id: 'intent-prev', status: 'SUCCEEDED' };
    mockPaymentIntentRepo.findOne.mockResolvedValue(existing);

    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      customerId: '11111111-1111-4111-a111-111111111111',
      restaurantId: '22222222-2222-4222-a222-222222222222',
      amount: '100000',
      paymentMethod: PaymentMethodType.WALLET,
      idempotencyKey: 'idemp-duplicate',
    });

    expect(result.alreadyProcessed).toBe(true);
    expect(result.paymentIntent).toBe(existing);
    expect(mockLedgerWriteRepo.postJournalTransaction).not.toHaveBeenCalled();
  });
});
