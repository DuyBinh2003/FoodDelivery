import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { LedgerWriteRepository } from '@/modules/ledger/repositories/ledger.write.repository.js';
import { PaymentIntent } from '@/modules/ledger/entities/payment-intent.entity.js';
import { ProcessPaymentDto, PaymentMethodType } from '@/modules/ledger/dto/process-payment.dto.js';
import { AccountCategory, EntryType, OwnerType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    @Inject(LedgerWriteRepository)
    private readonly ledgerWriteRepo: LedgerWriteRepository,
    @InjectRepository(PaymentIntent)
    private readonly paymentIntentRepo: Repository<PaymentIntent>,
  ) {}

  async execute(dto: ProcessPaymentDto) {
    // Check if idempotency key or payment intent already exists
    const existingIntent = await this.paymentIntentRepo.findOne({
      where: { idempotency_key: dto.idempotencyKey },
    });
    if (existingIntent) {
      return {
        paymentIntent: existingIntent,
        alreadyProcessed: true,
      };
    }

    if (dto.paymentMethod === PaymentMethodType.COD) {
      const intent = this.paymentIntentRepo.create({
        order_id: dto.orderId,
        customer_id: dto.customerId,
        amount: dto.amount,
        currency: 'VND',
        payment_method: 'COD',
        status: 'PENDING_COD',
        idempotency_key: dto.idempotencyKey,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {
          restaurantId: dto.restaurantId,
          type: 'CASH_ON_DELIVERY',
        },
      });
      const savedIntent = await this.paymentIntentRepo.save(intent);
      return {
        paymentIntent: savedIntent,
        transaction: null,
      };
    }

    // WALLET flow:
    // 1. Get or create Customer Wallet
    let customerWallet = await this.walletReadRepo.getWalletByOwner(dto.customerId, OwnerType.CUSTOMER);
    if (!customerWallet) {
      const created = await this.walletWriteRepo.createWalletWithBalance({
        ownerId: dto.customerId,
        ownerType: OwnerType.CUSTOMER,
        accountCategory: AccountCategory.LIABILITY,
        accountCode: `WALLET_CUSTOMER_${dto.customerId}`,
        currency: 'VND',
      });
      customerWallet = created.wallet;
    }

    // 2. Get or create Restaurant Wallet
    let restaurantWallet = await this.walletReadRepo.getWalletByOwner(dto.restaurantId, OwnerType.RESTAURANT);
    if (!restaurantWallet) {
      const created = await this.walletWriteRepo.createWalletWithBalance({
        ownerId: dto.restaurantId,
        ownerType: OwnerType.RESTAURANT,
        accountCategory: AccountCategory.LIABILITY,
        accountCode: `WALLET_RESTAURANT_${dto.restaurantId}`,
        currency: 'VND',
      });
      restaurantWallet = created.wallet;
    }

    // 3. Get or create Platform Revenue Account
    const platformRevenueAccount = await this.walletWriteRepo.getOrCreateSystemAccount(
      'SYS_REVENUE_PLATFORM_COMMISSION',
      AccountCategory.REVENUE,
    );

    // 4. Calculate revenue split: 80% restaurant of subtotal, 20% platform commission
    const totalNum = Number(dto.amount);
    const subtotalNum = dto.subtotal ? Number(dto.subtotal) : totalNum;
    const restaurantAmountNum = Math.min(Math.round(subtotalNum * 0.80), totalNum);
    const platformFeeNum = totalNum - restaurantAmountNum;

    // 5. Post Journal Transaction (Double-Entry Invariant: DEBIT customer = CREDIT restaurant + CREDIT platform)
    const transactionCode = `PAY-${dto.orderId.slice(0, 8)}-${Date.now()}`;
    const ledgerResult = await this.ledgerWriteRepo.postJournalTransaction({
      transactionCode,
      referenceType: ReferenceType.ORDER_SETTLEMENT,
      referenceId: dto.orderId,
      description: `Payment for order ${dto.orderId} via FoodPay Wallet`,
      idempotencyKey: dto.idempotencyKey,
      entries: [
        {
          walletAccountId: customerWallet.id,
          entryType: EntryType.DEBIT,
          amount: dto.amount,
        },
        {
          walletAccountId: restaurantWallet.id,
          entryType: EntryType.CREDIT,
          amount: restaurantAmountNum.toString(),
        },
        {
          walletAccountId: platformRevenueAccount.id,
          entryType: EntryType.CREDIT,
          amount: platformFeeNum.toString(),
        },
      ],
    });

    // 6. Save PaymentIntent as SUCCEEDED
    const intent = this.paymentIntentRepo.create({
      order_id: dto.orderId,
      customer_id: dto.customerId,
      amount: dto.amount,
      currency: 'VND',
      payment_method: 'WALLET',
      gateway_transaction_id: transactionCode,
      status: 'SUCCEEDED',
      idempotency_key: dto.idempotencyKey,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        restaurantId: dto.restaurantId,
        transactionId: ledgerResult.transaction.id,
        transactionCode,
        restaurantAmount: restaurantAmountNum,
        platformFee: platformFeeNum,
      },
    });
    const savedIntent = await this.paymentIntentRepo.save(intent);

    return {
      paymentIntent: savedIntent,
      transaction: ledgerResult.transaction,
      entries: ledgerResult.entries,
    };
  }
}
