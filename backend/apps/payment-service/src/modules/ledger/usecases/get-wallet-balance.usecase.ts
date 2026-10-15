import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WalletReadRepository } from '../repositories/wallet.read.repository.js';
import { LedgerReadRepository } from '../repositories/ledger.read.repository.js';
import { WalletAccount } from '../entities/wallet-account.entity.js';
import { WalletBalance } from '../entities/wallet-balance.entity.js';
import { LedgerEntry } from '../entities/ledger-entry.entity.js';

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
}
