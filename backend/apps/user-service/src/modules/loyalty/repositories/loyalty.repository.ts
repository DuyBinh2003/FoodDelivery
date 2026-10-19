import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LoyaltyWallet } from '@/modules/loyalty/entities/loyalty-wallet.entity.js';
import { LoyaltyTransaction } from '@/modules/loyalty/entities/loyalty-transaction.entity.js';
import { MembershipTier } from '@/modules/loyalty/enums/membership-tier.enum.js';

@Injectable()
export class LoyaltyRepository {
  private readonly logger = new Logger(LoyaltyRepository.name);

  constructor(
    @InjectRepository(LoyaltyWallet)
    private readonly walletRepo: Repository<LoyaltyWallet>,
    @InjectRepository(LoyaltyTransaction)
    private readonly txRepo: Repository<LoyaltyTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async getOrCreateWallet(userId: string): Promise<LoyaltyWallet> {
    const existing = await this.walletRepo.findOne({
      where: { user_id: userId, is_deleted: false },
    });

    if (existing) {
      return existing;
    }

    const newWallet = this.walletRepo.create({
      user_id: userId,
      available_points: 0,
      lifetime_points: 0,
      tier: MembershipTier.BRONZE,
    });

    try {
      return await this.walletRepo.save(newWallet);
    } catch (error) {
      // Handle potential race condition if 2 requests create wallet simultaneously
      const retry = await this.walletRepo.findOne({
        where: { user_id: userId, is_deleted: false },
      });
      if (retry) {
        return retry;
      }
      this.logger.error(`Failed to create loyalty wallet for user: ${userId}`, { cause: error });
      throw error;
    }
  }

  async findWalletByUserId(userId: string): Promise<LoyaltyWallet | null> {
    return this.walletRepo.findOne({
      where: { user_id: userId, is_deleted: false },
    });
  }

  async findTransactionByIdempotencyKey(key: string): Promise<LoyaltyTransaction | null> {
    return this.txRepo.findOne({
      where: { idempotency_key: key },
    });
  }

  async saveWallet(wallet: LoyaltyWallet): Promise<LoyaltyWallet> {
    return this.walletRepo.save(wallet);
  }

  async recordTransaction(data: {
    wallet_id: string;
    user_id: string;
    transaction_type: LoyaltyTransaction['transaction_type'];
    points: number;
    balance_after: number;
    reference_type: LoyaltyTransaction['reference_type'];
    reference_id: string;
    idempotency_key: string;
    description: string;
  }): Promise<LoyaltyTransaction> {
    const tx = this.txRepo.create(data);
    return this.txRepo.save(tx);
  }

  async getRecentTransactions(userId: string, limit: number = 20): Promise<LoyaltyTransaction[]> {
    return this.txRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
