import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { LedgerWriteRepository, PostLedgerResult } from '@/modules/ledger/repositories/ledger.write.repository.js';
import { DisputeRefundDto } from '@/modules/ledger/dto/dispute-refund.dto.js';
import { AccountCategory, EntryType, OwnerType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

@Injectable()
export class DisputeRefundUseCase {
  private readonly logger = new Logger(DisputeRefundUseCase.name);

  constructor(
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    @Inject(LedgerWriteRepository)
    private readonly ledgerWriteRepo: LedgerWriteRepository,
  ) {}

  async execute(dto: DisputeRefundDto): Promise<PostLedgerResult> {
    const amountNum = Number(dto.refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Số tiền bồi hoàn không hợp lệ');
    }

    // 1. Lấy hoặc tạo ví khách hàng nhận bồi hoàn (Customer Liability Account)
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

    // 2. Xác định tài khoản chịu phạt (Penalty Source Account)
    let penaltyWalletAccountId: string;

    if (dto.penaltyParty === 'RESTAURANT' && dto.penaltyPartyId) {
      let restaurantWallet = await this.walletReadRepo.getWalletByOwner(dto.penaltyPartyId, OwnerType.RESTAURANT);
      if (!restaurantWallet) {
        const created = await this.walletWriteRepo.createWalletWithBalance({
          ownerId: dto.penaltyPartyId,
          ownerType: OwnerType.RESTAURANT,
          accountCategory: AccountCategory.LIABILITY,
          accountCode: `WALLET_RESTAURANT_${dto.penaltyPartyId}`,
          currency: 'VND',
        });
        restaurantWallet = created.wallet;
      }
      penaltyWalletAccountId = restaurantWallet.id;
    } else if (dto.penaltyParty === 'DRIVER' && dto.penaltyPartyId) {
      let driverWallet = await this.walletReadRepo.getWalletByOwner(dto.penaltyPartyId, OwnerType.DRIVER);
      if (!driverWallet) {
        const created = await this.walletWriteRepo.createWalletWithBalance({
          ownerId: dto.penaltyPartyId,
          ownerType: OwnerType.DRIVER,
          accountCategory: AccountCategory.LIABILITY,
          accountCode: `WALLET_DRIVER_${dto.penaltyPartyId}`,
          currency: 'VND',
        });
        driverWallet = created.wallet;
      }
      penaltyWalletAccountId = driverWallet.id;
    } else {
      // Phạt sàn / Chi phí bồi thường hệ thống
      const platformExpenseAccount = await this.walletWriteRepo.getOrCreateSystemAccount(
        'SYS_EXPENSE_DISPUTE_COMPENSATION',
        AccountCategory.EXPENSE,
      );
      penaltyWalletAccountId = platformExpenseAccount.id;
    }

    const transactionCode = `DISPUTE-${dto.disputeId.slice(0, 8)}-${Date.now()}`;
    const idempotencyKey = `DISPUTE-REFUND-${dto.disputeId}`;
    const description =
      dto.description ||
      `Bồi thường khiếu nại đơn #${dto.orderId.slice(0, 8)} (${dto.penaltyParty} chịu phạt)`;

    // 3. Ghi nhận Sổ cái kép (Double-Entry Bookkeeping):
    // - DEBIT: Tài khoản chịu phạt (giảm số dư ví đối tác hoặc ghi nhận chi phí bồi hoàn sàn)
    // - CREDIT: Ví khách hàng (tăng số dư khả dụng ví khách)
    const result = await this.ledgerWriteRepo.postJournalTransaction({
      transactionCode,
      referenceType: ReferenceType.REFUND,
      referenceId: dto.disputeId,
      description,
      idempotencyKey,
      entries: [
        {
          walletAccountId: penaltyWalletAccountId,
          entryType: EntryType.DEBIT,
          amount: amountNum.toString(),
        },
        {
          walletAccountId: customerWallet.id,
          entryType: EntryType.CREDIT,
          amount: amountNum.toString(),
        },
      ],
    });

    this.logger.log(
      `[DisputeRefund] Successfully compensated ${amountNum} VND to customer ${dto.customerId} for dispute ${dto.disputeId} from ${dto.penaltyParty}`,
    );

    return result;
  }
}
