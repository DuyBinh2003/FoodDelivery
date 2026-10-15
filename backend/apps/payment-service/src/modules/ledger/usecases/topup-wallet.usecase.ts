import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { LedgerWriteRepository, PostLedgerResult } from '@/modules/ledger/repositories/ledger.write.repository.js';
import { TopupWalletDto } from '@/modules/ledger/dto/topup-wallet.dto.js';
import { AccountCategory, EntryType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

@Injectable()
export class TopupWalletUseCase {
  constructor(
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    @Inject(LedgerWriteRepository)
    private readonly ledgerWriteRepo: LedgerWriteRepository,
  ) {}

  async execute(dto: TopupWalletDto): Promise<PostLedgerResult> {
    const targetWallet = await this.walletReadRepo.getWalletById(dto.walletAccountId);
    if (!targetWallet) {
      throw new NotFoundException(`Target wallet not found: ${dto.walletAccountId}`);
    }

    // Ensure platform asset gateway account exists
    const gatewayAssetCode = `SYS_ASSET_GATEWAY_${dto.paymentMethod.toUpperCase()}`;
    const gatewayAssetAccount = await this.walletWriteRepo.getOrCreateSystemAccount(
      gatewayAssetCode,
      AccountCategory.ASSET,
    );

    const transactionCode = `TOPUP-${Date.now()}-${dto.walletAccountId.slice(0, 8)}`;

    // FinTech Double-Entry:
    // 1. DEBIT Asset account (money received in bank/gateway)
    // 2. CREDIT User/Driver liability wallet (wallet balance increased)
    return this.ledgerWriteRepo.postJournalTransaction({
      transactionCode,
      referenceType: ReferenceType.WALLET_TOPUP,
      referenceId: dto.referenceId,
      description: `Wallet top-up of ${dto.amount} VND via ${dto.paymentMethod}`,
      idempotencyKey: dto.idempotencyKey,
      entries: [
        {
          walletAccountId: gatewayAssetAccount.id,
          entryType: EntryType.DEBIT,
          amount: dto.amount,
        },
        {
          walletAccountId: targetWallet.id,
          entryType: EntryType.CREDIT,
          amount: dto.amount,
        },
      ],
    });
  }
}
