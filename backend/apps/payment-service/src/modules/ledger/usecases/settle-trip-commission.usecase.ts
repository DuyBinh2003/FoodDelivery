import { Injectable, Inject, Logger } from '@nestjs/common';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { LedgerWriteRepository } from '@/modules/ledger/repositories/ledger.write.repository.js';
import { AccountCategory, EntryType, OwnerType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

export interface SettleTripCommissionDto {
  orderId: string;
  driverId: string;
  tripAmount: number | string;
  feeRate?: number;
}

@Injectable()
export class SettleTripCommissionUseCase {
  private readonly logger = new Logger(SettleTripCommissionUseCase.name);

  constructor(
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    @Inject(LedgerWriteRepository)
    private readonly ledgerWriteRepo: LedgerWriteRepository,
  ) {}

  async execute(dto: SettleTripCommissionDto) {
    const feeRate = dto.feeRate !== undefined && dto.feeRate > 0 ? dto.feeRate : 10;
    const totalTripNum = Number(dto.tripAmount);
    if (isNaN(totalTripNum) || totalTripNum <= 0) {
      this.logger.warn(`Invalid tripAmount received for order ${dto.orderId}: ${dto.tripAmount}`);
      return null;
    }

    // Tính phí chiết khấu nền tảng (mặc định 10% của cước cuốc xe, làm tròn đến hàng nghìn đồng)
    const platformFee = Math.max(1000, Math.round((totalTripNum * (feeRate / 100)) / 1000) * 1000);

    // 1. Lấy hoặc tạo ví tài xế
    let driverWallet = await this.walletReadRepo.getWalletByOwner(dto.driverId, OwnerType.DRIVER);
    if (!driverWallet) {
      const created = await this.walletWriteRepo.createWalletWithBalance({
        ownerId: dto.driverId,
        ownerType: OwnerType.DRIVER,
        accountCategory: AccountCategory.LIABILITY,
        accountCode: `WALLET_DRIVER_${dto.driverId}`,
        currency: 'VND',
      });
      driverWallet = created.wallet;
    }

    // 2. Lấy hoặc tạo tài khoản doanh thu nền tảng
    const platformRevenueAccount = await this.walletWriteRepo.getOrCreateSystemAccount(
      'SYS_REVENUE_PLATFORM_COMMISSION',
      AccountCategory.REVENUE,
    );

    // 3. Ghi nhận bút toán kế toán kép: DEBIT ví tài xế (trừ phí hoa hồng) & CREDIT ví doanh thu sàn
    const transactionCode = `TRIP-${dto.orderId.slice(0, 8)}-${Date.now()}`;
    const idempotencyKey = `TRIP-COMMISSION-${dto.orderId}`;

    const ledgerResult = await this.ledgerWriteRepo.postJournalTransaction({
      transactionCode,
      referenceType: ReferenceType.COMMISSION_FEE,
      referenceId: dto.orderId,
      description: `Chiết khấu hoa hồng cuốc xe ${dto.orderId} (${feeRate}%)`,
      idempotencyKey,
      entries: [
        {
          walletAccountId: driverWallet.id,
          entryType: EntryType.DEBIT,
          amount: platformFee.toString(),
        },
        {
          walletAccountId: platformRevenueAccount.id,
          entryType: EntryType.CREDIT,
          amount: platformFee.toString(),
        },
      ],
    });

    this.logger.log(
      `[SettleTripCommission] Successfully credited platform fee ${platformFee} VND from driver ${dto.driverId} for order ${dto.orderId}`,
    );

    return {
      success: true,
      platformFee,
      feeRate,
      transaction: ledgerResult.transaction,
      entries: ledgerResult.entries,
      driverInactiveWarnings: ledgerResult.driverInactiveWarnings,
    };
  }
}
