import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { LedgerReadRepository } from '@/modules/ledger/repositories/ledger.read.repository.js';
import { WalletAccount } from '@/modules/ledger/entities/wallet-account.entity.js';
import { WalletBalance } from '@/modules/ledger/entities/wallet-balance.entity.js';
import { LedgerEntry } from '@/modules/ledger/entities/ledger-entry.entity.js';
import { AccountCategory, OwnerType } from '@/modules/ledger/constants/ledger.enums.js';

export interface WalletDetailsResponse {
  wallet: WalletAccount;
  balance: WalletBalance;
  recentEntries: LedgerEntry[];
  isDriverInactive?: boolean;
}

@Injectable()
export class GetWalletBalanceUseCase {
  constructor(
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    @Inject(LedgerReadRepository)
    private readonly ledgerReadRepo: LedgerReadRepository,
  ) {}

  async execute(walletAccountId: string): Promise<WalletDetailsResponse> {
    const wallet = await this.walletReadRepo.getWalletById(walletAccountId);
    if (!wallet) {
      throw new NotFoundException(`Wallet account not found: ${walletAccountId}`);
    }

    const balance = await this.walletReadRepo.getWalletBalance(walletAccountId);
    if (!balance) {
      throw new NotFoundException(`Balance not found for wallet: ${walletAccountId}`);
    }

    const recentEntries = await this.ledgerReadRepo.getEntriesByWalletId(walletAccountId, 20);

    const isNegative = Number(balance.available_balance) < 0;

    return {
      wallet,
      balance,
      recentEntries,
      isDriverInactive: wallet.owner_type === 'DRIVER' && isNegative,
    };
  }

  async executeByOwner(ownerId: string, ownerType: OwnerType = OwnerType.CUSTOMER): Promise<WalletDetailsResponse> {
    let wallet = await this.walletReadRepo.getWalletByOwner(ownerId, ownerType);
    if (!wallet) {
      // Lazy auto-create wallet account
      const accountCode = `WALLET_${ownerType}_${ownerId}`;
      const created = await this.walletWriteRepo.createWalletWithBalance({
        ownerId,
        ownerType,
        accountCategory: AccountCategory.LIABILITY,
        accountCode,
        currency: 'VND',
      });
      wallet = created.wallet;
    }

    return this.execute(wallet.id);
  }
}

