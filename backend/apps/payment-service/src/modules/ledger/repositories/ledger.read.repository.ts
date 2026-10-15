import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerTransaction } from '@/modules/ledger/entities/ledger-transaction.entity.js';
import { LedgerEntry } from '@/modules/ledger/entities/ledger-entry.entity.js';

@Injectable()
export class LedgerReadRepository {
  constructor(
    @InjectRepository(LedgerTransaction)
    private readonly transactionRepo: Repository<LedgerTransaction>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepo: Repository<LedgerEntry>,
  ) {}

  async getTransactionByCode(transactionCode: string): Promise<LedgerTransaction | null> {
    return this.transactionRepo.findOne({
      where: { transaction_code: transactionCode, is_deleted: false },
    });
  }

  async getTransactionByIdempotencyKey(key: string): Promise<LedgerTransaction | null> {
    return this.transactionRepo.findOne({
      where: { idempotency_key: key, is_deleted: false },
    });
  }

  async getEntriesByTransactionId(ledgerTransactionId: string): Promise<LedgerEntry[]> {
    return this.entryRepo.find({
      where: { ledger_transaction_id: ledgerTransactionId, is_deleted: false },
      order: { sequence_num: 'ASC' },
    });
  }

  async getEntriesByWalletId(walletAccountId: string, limit = 50): Promise<LedgerEntry[]> {
    return this.entryRepo.find({
      where: { wallet_account_id: walletAccountId, is_deleted: false },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
