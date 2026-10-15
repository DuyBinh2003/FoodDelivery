import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from './entities/wallet-account.entity.js';
import { WalletBalance } from './entities/wallet-balance.entity.js';
import { LedgerTransaction } from './entities/ledger-transaction.entity.js';
import { LedgerEntry } from './entities/ledger-entry.entity.js';
import { PaymentIntent } from './entities/payment-intent.entity.js';
import { IdempotencyKey } from './entities/idempotency-key.entity.js';
import { Outbox } from './entities/outbox.entity.js';

import { WalletReadRepository } from './repositories/wallet.read.repository.js';
import { WalletWriteRepository } from './repositories/wallet.write.repository.js';
import { LedgerReadRepository } from './repositories/ledger.read.repository.js';
import { LedgerWriteRepository } from './repositories/ledger.write.repository.js';

import { CreateWalletUseCase } from './usecases/create-wallet.usecase.js';
import { RecordLedgerTransactionUseCase } from './usecases/record-ledger-transaction.usecase.js';
import { GetWalletBalanceUseCase } from './usecases/get-wallet-balance.usecase.js';
import { TopupWalletUseCase } from './usecases/topup-wallet.usecase.js';

import { WalletController } from './wallet.controller.js';
import { LedgerController } from './ledger.controller.js';

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
  controllers: [WalletController, LedgerController],
  providers: [
    WalletReadRepository,
    WalletWriteRepository,
    LedgerReadRepository,
    LedgerWriteRepository,
    CreateWalletUseCase,
    RecordLedgerTransactionUseCase,
    GetWalletBalanceUseCase,
    TopupWalletUseCase,
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
  ],
})
export class LedgerModule {}
