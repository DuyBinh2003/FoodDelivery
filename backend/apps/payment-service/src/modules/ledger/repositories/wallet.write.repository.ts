import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletAccount } from '../entities/wallet-account.entity.js';
import { WalletBalance } from '../entities/wallet-balance.entity.js';
import { AccountCategory, OwnerType, WalletStatus } from '../constants/ledger.enums.js';

export interface CreateWalletParams {
  ownerId: string;
  ownerType: OwnerType;
  accountCategory: AccountCategory;
  accountCode: string;
  currency?: string;
}

@Injectable()
export class WalletWriteRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createWalletWithBalance(params: CreateWalletParams): Promise<{ wallet: WalletAccount; balance: WalletBalance }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(WalletAccount, {
        where: { account_code: params.accountCode },
      });
      if (existing) {
        throw new BadRequestException(`Wallet with account code '${params.accountCode}' already exists`);
      }

      const wallet = queryRunner.manager.create(WalletAccount, {
        owner_id: params.ownerId,
        owner_type: params.ownerType,
        account_category: params.accountCategory,
        account_code: params.accountCode,
        currency: params.currency || 'VND',
        status: WalletStatus.ACTIVE,
      });
      const savedWallet = await queryRunner.manager.save(wallet);

      const balance = queryRunner.manager.create(WalletBalance, {
        wallet_account_id: savedWallet.id,
        available_balance: '0',
        locked_balance: '0',
        currency: savedWallet.currency,
        version: '0',
        last_ledger_entry_id: null,
      });
      const savedBalance = await queryRunner.manager.save(balance);

      await queryRunner.commitTransaction();
      return { wallet: savedWallet, balance: savedBalance };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrCreateSystemAccount(accountCode: string, category: AccountCategory): Promise<WalletAccount> {
    const existing = await this.dataSource.getRepository(WalletAccount).findOne({
      where: { account_code: accountCode },
    });
    if (existing) {
      return existing;
    }

    // System accounts use a deterministic dummy system UUID
    const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';
    const result = await this.createWalletWithBalance({
      ownerId: SYSTEM_UUID,
      ownerType: OwnerType.PLATFORM,
      accountCategory: category,
      accountCode: accountCode,
      currency: 'VND',
    });
    return result.wallet;
  }
}
