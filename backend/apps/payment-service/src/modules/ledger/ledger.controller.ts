import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { RecordLedgerTransactionUseCase } from '@/modules/ledger/usecases/record-ledger-transaction.usecase.js';
import { LedgerReadRepository } from '@/modules/ledger/repositories/ledger.read.repository.js';
import { RecordLedgerTransactionDto } from '@/modules/ledger/dto/record-ledger-transaction.dto.js';

@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly recordLedgerTxnUseCase: RecordLedgerTransactionUseCase,
    private readonly ledgerReadRepo: LedgerReadRepository,
  ) {}

  @Post('transactions')
  async recordTransaction(@Body() dto: RecordLedgerTransactionDto) {
    return this.recordLedgerTxnUseCase.execute(dto);
  }

  @Get('transactions/:code')
  async getTransactionByCode(@Param('code') code: string) {
    const txn = await this.ledgerReadRepo.getTransactionByCode(code);
    if (!txn) {
      return null;
    }
    const entries = await this.ledgerReadRepo.getEntriesByTransactionId(txn.id);
    return {
      transaction: txn,
      entries,
    };
  }
}
