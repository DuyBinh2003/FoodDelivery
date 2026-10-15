import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from '@/modules/ledger/entities/wallet-account.entity.js';
import { WalletBalance } from '@/modules/ledger/entities/wallet-balance.entity.js';
import { LedgerTransaction } from '@/modules/ledger/entities/ledger-transaction.entity.js';
import { LedgerEntry } from '@/modules/ledger/entities/ledger-entry.entity.js';
import { PaymentIntent } from '@/modules/ledger/entities/payment-intent.entity.js';
import { IdempotencyKey } from '@/modules/ledger/entities/idempotency-key.entity.js';
import { Outbox } from '@/modules/ledger/entities/outbox.entity.js';

import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { LedgerReadRepository } from '@/modules/ledger/repositories/ledger.read.repository.js';
import { LedgerWriteRepository } from '@/modules/ledger/repositories/ledger.write.repository.js';

import { CreateWalletUseCase } from '@/modules/ledger/usecases/create-wallet.usecase.js';
import { RecordLedgerTransactionUseCase } from '@/modules/ledger/usecases/record-ledger-transaction.usecase.js';
import { GetWalletBalanceUseCase } from '@/modules/ledger/usecases/get-wallet-balance.usecase.js';
import { TopupWalletUseCase } from '@/modules/ledger/usecases/topup-wallet.usecase.js';

import { ProcessPaymentUseCase } from '@/modules/ledger/usecases/process-payment.usecase.js';

import { WalletController } from '@/modules/ledger/wallet.controller.js';
import { LedgerController } from '@/modules/ledger/ledger.controller.js';
import { PaymentController } from '@/modules/ledger/payment.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletAccount,
      WalletBalance,
      LedgerTransaction,
      LedgerEntry,
      PaymentIntent,
      IdempotencyKey,
      Outbox,
    ]),
  ],
  controllers: [WalletController, LedgerController, PaymentController],
  providers: [
    WalletReadRepository,
    WalletWriteRepository,
    LedgerReadRepository,
    LedgerWriteRepository,
    CreateWalletUseCase,
    RecordLedgerTransactionUseCase,
    GetWalletBalanceUseCase,
    TopupWalletUseCase,
    ProcessPaymentUseCase,
  ],
  exports: [
    WalletReadRepository,
    WalletWriteRepository,
    LedgerReadRepository,
    LedgerWriteRepository,
    CreateWalletUseCase,
    RecordLedgerTransactionUseCase,
    GetWalletBalanceUseCase,
    TopupWalletUseCase,
    ProcessPaymentUseCase,
  ],
})
export class LedgerModule {}
