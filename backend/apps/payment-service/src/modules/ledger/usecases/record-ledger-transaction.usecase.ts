import { Injectable, Inject } from '@nestjs/common';
import { LedgerWriteRepository, PostLedgerResult } from '@/modules/ledger/repositories/ledger.write.repository.js';
import { RecordLedgerTransactionDto } from '@/modules/ledger/dto/record-ledger-transaction.dto.js';

@Injectable()
export class RecordLedgerTransactionUseCase {
  constructor(
    @Inject(LedgerWriteRepository)
    private readonly ledgerWriteRepo: LedgerWriteRepository,
  ) {}

  async execute(dto: RecordLedgerTransactionDto): Promise<PostLedgerResult> {
    return this.ledgerWriteRepo.postJournalTransaction({
      transactionCode: dto.transactionCode,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      entries: dto.entries.map((e) => ({
        walletAccountId: e.walletAccountId,
        entryType: e.entryType,
        amount: e.amount,
      })),
    });
  }
}
