import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletAccount } from '@/modules/ledger/entities/wallet-account.entity.js';
import { WalletBalance } from '@/modules/ledger/entities/wallet-balance.entity.js';
import { OwnerType } from '@/modules/ledger/constants/ledger.enums.js';

@Injectable()
export class WalletReadRepository {
  constructor(
    @InjectRepository(WalletAccount)
    private readonly walletAccountRepo: Repository<WalletAccount>,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepo: Repository<WalletBalance>,
  ) {}

  async getWalletById(id: string): Promise<WalletAccount | null> {
    return this.walletAccountRepo.findOne({
      where: { id, is_deleted: false },
    });
  }

  async getWalletByOwner(ownerId: string, ownerType: OwnerType): Promise<WalletAccount | null> {
    return this.walletAccountRepo.findOne({
      where: { owner_id: ownerId, owner_type: ownerType, is_deleted: false },
    });
  }

  async getWalletByCode(accountCode: string): Promise<WalletAccount | null> {
    return this.walletAccountRepo.findOne({
      where: { account_code: accountCode, is_deleted: false },
    });
  }

  async getWalletBalance(walletAccountId: string): Promise<WalletBalance | null> {
    return this.walletBalanceRepo.findOne({
      where: { wallet_account_id: walletAccountId, is_deleted: false },
    });
  }
}
