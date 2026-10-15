import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { LedgerTransaction } from '../entities/ledger-transaction.entity.js';
import { LedgerEntry } from '../entities/ledger-entry.entity.js';
import { WalletAccount } from '../entities/wallet-account.entity.js';
import { WalletBalance } from '../entities/wallet-balance.entity.js';
import { EntryType, AccountCategory, OwnerType, TransactionStatus, ReferenceType } from '../constants/ledger.enums.js';

export interface PostLedgerEntryParam {
  walletAccountId: string;
  entryType: EntryType;
  amount: string;
}

export interface PostLedgerTransactionCommand {
  transactionCode: string;
  referenceType: ReferenceType;
  referenceId: string;
  description: string;
  idempotencyKey: string;
  entries: PostLedgerEntryParam[];
}

export interface PostLedgerResult {
  transaction: LedgerTransaction;
  entries: LedgerEntry[];
  driverInactiveWarnings: Array<{ driverId: string; walletAccountId: string; currentBalance: string }>;
}

@Injectable()
export class LedgerWriteRepository {
  constructor(private readonly dataSource: DataSource) {}

  async postJournalTransaction(command: PostLedgerTransactionCommand): Promise<PostLedgerResult> {
    if (!command.entries || command.entries.length < 2) {
      throw new BadRequestException('A double-entry transaction must have at least 2 entries');
    }

    // 1. Validate Double-Entry invariant: Sum(DEBIT) == Sum(CREDIT) using Decimal.js
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const entry of command.entries) {
      const amt = new Decimal(entry.amount);
      if (amt.isNegative() || amt.isZero()) {
        throw new BadRequestException(`Entry amount must be strictly positive, got: ${entry.amount}`);
      }
      if (entry.entryType === EntryType.DEBIT) {
        totalDebit = totalDebit.plus(amt);
      } else if (entry.entryType === EntryType.CREDIT) {
        totalCredit = totalCredit.plus(amt);
      } else {
        throw new BadRequestException(`Invalid entry type: ${entry.entryType}`);
      }
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Double-entry invariant violated: Total DEBIT (${totalDebit.toString()}) does not match Total CREDIT (${totalCredit.toString()})`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Check Idempotency Key
      const existingTxn = await queryRunner.manager.findOne(LedgerTransaction, {
        where: { idempotency_key: command.idempotencyKey },
      });
      if (existingTxn) {
        const existingEntries = await queryRunner.manager.find(LedgerEntry, {
          where: { ledger_transaction_id: existingTxn.id },
          order: { sequence_num: 'ASC' },
        });
        await queryRunner.rollbackTransaction();
        return {
          transaction: existingTxn,
          entries: existingEntries,
          driverInactiveWarnings: [],
        };
      }

      // Check unique transaction_code
      const duplicateCode = await queryRunner.manager.findOne(LedgerTransaction, {
        where: { transaction_code: command.transactionCode },
      });
      if (duplicateCode) {
        throw new ConflictException(`Transaction code '${command.transactionCode}' already exists`);
      }

      // 3. Create and save LedgerTransaction header
      const ledgerTxn = queryRunner.manager.create(LedgerTransaction, {
        transaction_code: command.transactionCode,
        reference_type: command.referenceType,
        reference_id: command.referenceId,
        status: TransactionStatus.POSTED,
        description: command.description,
        idempotency_key: command.idempotencyKey,
      });
      const savedTxn = await queryRunner.manager.save(ledgerTxn);

      const savedEntries: LedgerEntry[] = [];
      const driverInactiveWarnings: Array<{ driverId: string; walletAccountId: string; currentBalance: string }> = [];

      // 4. Process each entry in sequence with Pessimistic Locking
      let seq = 1;
      for (const item of command.entries) {
        // Lock and fetch wallet account and its balance
        const wallet = await queryRunner.manager.findOne(WalletAccount, {
          where: { id: item.walletAccountId },
        });
        if (!wallet) {
          throw new BadRequestException(`Wallet account not found: ${item.walletAccountId}`);
        }

        const balance = await queryRunner.manager
          .createQueryBuilder(WalletBalance, 'wb')
          .setLock('pessimistic_write')
          .where('wb.wallet_account_id = :walletAccountId', { walletAccountId: wallet.id })
          .getOne();

        if (!balance) {
          throw new BadRequestException(`Wallet balance record not found for account: ${wallet.id}`);
        }

        const currentAvailable = new Decimal(balance.available_balance);
        const itemAmount = new Decimal(item.amount);
        let newAvailable = new Decimal(0);

        // FinTech accounting equation:
        // Asset & Expense: Debit increases (+), Credit decreases (-)
        // Liability, Equity & Revenue: Credit increases (+), Debit decreases (-)
        if (
          wallet.account_category === AccountCategory.ASSET ||
          wallet.account_category === AccountCategory.EXPENSE
        ) {
          if (item.entryType === EntryType.DEBIT) {
            newAvailable = currentAvailable.plus(itemAmount);
          } else {
            newAvailable = currentAvailable.minus(itemAmount);
          }
        } else {
          // LIABILITY, EQUITY, REVENUE
          if (item.entryType === EntryType.CREDIT) {
            newAvailable = currentAvailable.plus(itemAmount);
          } else {
            newAvailable = currentAvailable.minus(itemAmount);
          }
        }

        // Business rules on negative balances:
        if (newAvailable.isNegative()) {
          if (wallet.owner_type === OwnerType.CUSTOMER) {
            throw new BadRequestException(
              `Insufficient customer wallet balance. Available: ${currentAvailable.toString()} VND, required: ${itemAmount.toString()} VND`,
            );
          } else if (wallet.owner_type === OwnerType.DRIVER) {
            // DRIVER POLICY: Allow temporarily negative balance, but flag driver as INACTIVE
            driverInactiveWarnings.push({
              driverId: wallet.owner_id,
              walletAccountId: wallet.id,
              currentBalance: newAvailable.toString(),
            });
          } else if (wallet.owner_type === OwnerType.RESTAURANT) {
            throw new BadRequestException(
              `Insufficient restaurant wallet balance. Available: ${currentAvailable.toString()} VND`,
            );
          }
        }

        // Insert append-only ledger entry
        const entry = queryRunner.manager.create(LedgerEntry, {
          ledger_transaction_id: savedTxn.id,
          wallet_account_id: wallet.id,
          entry_type: item.entryType,
          amount: itemAmount.toString(),
          currency: wallet.currency,
          balance_after: newAvailable.toString(),
          sequence_num: seq++,
        });
        const savedEntry = await queryRunner.manager.save(entry);
        savedEntries.push(savedEntry);

        // Update materialized balance snapshot
        balance.available_balance = newAvailable.toString();
        balance.version = (BigInt(balance.version) + 1n).toString();
        balance.last_ledger_entry_id = savedEntry.id;
        await queryRunner.manager.save(balance);
      }

      await queryRunner.commitTransaction();
      return {
        transaction: savedTxn,
        entries: savedEntries,
        driverInactiveWarnings,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
