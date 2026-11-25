import { Decimal } from 'decimal.js';
import {
  DEMO_IDS,
  type SeedLedgerEntryRecord,
  type SeedLedgerTransactionRecord,
  type SeedWalletAccountRecord,
  type SeedWalletBalanceRecord,
} from '@/common/seeding/seed-types.js';
import { deterministicUuid } from '@/common/seeding/seed-prng.js';

interface InternalWalletState {
  account: SeedWalletAccountRecord;
  availableBalance: Decimal;
  lockedBalance: Decimal;
  version: bigint;
  lastLedgerEntryId: string | null;
}

export interface LedgerPostingEntry {
  walletAccountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: Decimal;
}

export interface LedgerPostingCommand {
  transactionKey: string;
  transactionCode: string;
  referenceType: SeedLedgerTransactionRecord['reference_type'];
  referenceId: string;
  description: string;
  idempotencyKey: string;
  postedAt: Date;
  entries: readonly LedgerPostingEntry[];
}

/**
 * Deterministic Double-Entry Bookkeeping Ledger Simulator.
 * Guarantees SUM(DEBIT) == SUM(CREDIT) for every transaction and chronologically exact balance_after snapshots.
 */
export class SeedLedgerEngine {
  private readonly walletsById = new Map<string, InternalWalletState>();
  private readonly walletsByCode = new Map<string, InternalWalletState>();
  private readonly transactions: SeedLedgerTransactionRecord[] = [];
  private readonly entries: SeedLedgerEntryRecord[] = [];
  private readonly idempotencySeen = new Set<string>();

  readonly systemRevenueAccountId: string;
  readonly systemGatewayVnpayAccountId: string;
  readonly systemGatewayMomoAccountId: string;

  constructor(createdAt: Date) {
    this.systemRevenueAccountId = this.ensureWallet({
      ownerId: DEMO_IDS.PLATFORM_SYSTEM_OWNER_ID,
      ownerType: 'PLATFORM',
      accountCategory: 'REVENUE',
      accountCode: 'SYS_REVENUE_PLATFORM_COMMISSION',
      createdAt,
    }).id;

    this.systemGatewayVnpayAccountId = this.ensureWallet({
      ownerId: DEMO_IDS.PLATFORM_SYSTEM_OWNER_ID,
      ownerType: 'PLATFORM',
      accountCategory: 'ASSET',
      accountCode: 'SYS_ASSET_GATEWAY_VNPAY',
      createdAt,
    }).id;

    this.systemGatewayMomoAccountId = this.ensureWallet({
      ownerId: DEMO_IDS.PLATFORM_SYSTEM_OWNER_ID,
      ownerType: 'PLATFORM',
      accountCategory: 'ASSET',
      accountCode: 'SYS_ASSET_GATEWAY_MOMO',
      createdAt,
    }).id;
  }

  ensureWallet(params: {
    ownerId: string;
    ownerType: SeedWalletAccountRecord['owner_type'];
    accountCategory: SeedWalletAccountRecord['account_category'];
    accountCode: string;
    createdAt: Date;
  }): SeedWalletAccountRecord {
    const existing = this.walletsByCode.get(params.accountCode);
    if (existing) {
      return existing.account;
    }

    const walletId = deterministicUuid('wallet-account', params.accountCode);
    const account: SeedWalletAccountRecord = {
      id: walletId,
      owner_id: params.ownerId,
      owner_type: params.ownerType,
      account_category: params.accountCategory,
      account_code: params.accountCode,
      currency: 'VND',
      status: 'ACTIVE',
      created_at: params.createdAt,
    };
    const state: InternalWalletState = {
      account,
      availableBalance: new Decimal(0),
      lockedBalance: new Decimal(0),
      version: 0n,
      lastLedgerEntryId: null,
    };
    this.walletsById.set(walletId, state);
    this.walletsByCode.set(params.accountCode, state);
    return account;
  }

  getAvailableBalance(walletAccountId: string): Decimal {
    const state = this.walletsById.get(walletAccountId);
    if (!state) {
      throw new Error(`[SeedLedgerError] Wallet not found: ${walletAccountId}`);
    }
    return state.availableBalance;
  }

  postTransaction(cmd: LedgerPostingCommand): void {
    if (cmd.entries.length < 2) {
      throw new Error(`[SeedLedgerError] Transaction ${cmd.transactionCode} requires >= 2 entries.`);
    }
    if (this.idempotencySeen.has(cmd.idempotencyKey)) {
      throw new Error(`[SeedLedgerError] Duplicate idempotency_key: ${cmd.idempotencyKey}`);
    }

    let debitTotal = new Decimal(0);
    let creditTotal = new Decimal(0);
    for (const e of cmd.entries) {
      if (e.amount.isNegative() || e.amount.isZero()) {
        throw new Error(`[SeedLedgerError] Entry amount must be positive, got ${e.amount.toString()} in ${cmd.transactionCode}`);
      }
      if (e.entryType === 'DEBIT') {
        debitTotal = debitTotal.plus(e.amount);
      } else {
        creditTotal = creditTotal.plus(e.amount);
      }
    }

    if (!debitTotal.equals(creditTotal)) {
      throw new Error(
        `[SeedLedgerError] Double-entry imbalance in ${cmd.transactionCode}: DEBIT=${debitTotal.toString()} != CREDIT=${creditTotal.toString()}`,
      );
    }

    const txnId = deterministicUuid('ledger-txn', cmd.transactionKey);
    this.idempotencySeen.add(cmd.idempotencyKey);
    this.transactions.push({
      id: txnId,
      transaction_code: cmd.transactionCode,
      reference_type: cmd.referenceType,
      reference_id: cmd.referenceId,
      status: 'POSTED',
      description: cmd.description,
      idempotency_key: cmd.idempotencyKey,
      posted_at: cmd.postedAt,
      created_at: cmd.postedAt,
    });

    let seq = 1;
    for (const item of cmd.entries) {
      const state = this.walletsById.get(item.walletAccountId);
      if (!state) {
        throw new Error(`[SeedLedgerError] Missing wallet account ${item.walletAccountId} for ${cmd.transactionCode}`);
      }

      const isAssetOrExpense =
        state.account.account_category === 'ASSET' || state.account.account_category === 'EXPENSE';

      let nextAvailable: Decimal;
      if (isAssetOrExpense) {
        nextAvailable =
          item.entryType === 'DEBIT'
            ? state.availableBalance.plus(item.amount)
            : state.availableBalance.minus(item.amount);
      } else {
        nextAvailable =
          item.entryType === 'CREDIT'
            ? state.availableBalance.plus(item.amount)
            : state.availableBalance.minus(item.amount);
      }

      if (
        nextAvailable.isNegative() &&
        (state.account.owner_type === 'CUSTOMER' || state.account.owner_type === 'RESTAURANT')
      ) {
        throw new Error(
          `[SeedLedgerError] Negative balance for ${state.account.owner_type} wallet ${state.account.account_code}: ${nextAvailable.toString()}`,
        );
      }

      const entryId = deterministicUuid('ledger-entry', `${cmd.transactionKey}:${seq}`);
      this.entries.push({
        id: entryId,
        ledger_transaction_id: txnId,
        wallet_account_id: state.account.id,
        entry_type: item.entryType,
        amount: item.amount.toFixed(0),
        currency: 'VND',
        balance_after: nextAvailable.toFixed(0),
        sequence_num: seq,
        created_at: cmd.postedAt,
      });

      state.availableBalance = nextAvailable;
      state.version += 1n;
      state.lastLedgerEntryId = entryId;
      seq++;
    }
  }

  /**
   * Simulates Phase-1 Hold for PENDING / PROCESSING withdrawal requests
   * (decrements available_balance, increments locked_balance without posting ledger entries yet).
   */
  holdForWithdrawal(walletAccountId: string, amount: Decimal): void {
    const state = this.walletsById.get(walletAccountId);
    if (!state) {
      throw new Error(`[SeedLedgerError] Missing wallet ${walletAccountId} for withdrawal hold`);
    }
    if (state.availableBalance.lessThan(amount)) {
      throw new Error(
        `[SeedLedgerError] Insufficient available balance (${state.availableBalance.toString()}) for hold (${amount.toString()})`,
      );
    }
    state.availableBalance = state.availableBalance.minus(amount);
    state.lockedBalance = state.lockedBalance.plus(amount);
    state.version += 1n;
  }

  exportResults(): {
    walletAccounts: SeedWalletAccountRecord[];
    walletBalances: SeedWalletBalanceRecord[];
    ledgerTransactions: SeedLedgerTransactionRecord[];
    ledgerEntries: SeedLedgerEntryRecord[];
  } {
    const walletAccounts: SeedWalletAccountRecord[] = [];
    const walletBalances: SeedWalletBalanceRecord[] = [];

    for (const state of this.walletsById.values()) {
      walletAccounts.push(state.account);
      walletBalances.push({
        id: deterministicUuid('wallet-balance', state.account.id),
        wallet_account_id: state.account.id,
        available_balance: state.availableBalance.toFixed(0),
        locked_balance: state.lockedBalance.toFixed(0),
        currency: 'VND',
        version: state.version.toString(),
        last_ledger_entry_id: state.lastLedgerEntryId,
      });
    }

    return {
      walletAccounts,
      walletBalances,
      ledgerTransactions: [...this.transactions],
      ledgerEntries: [...this.entries],
    };
  }
}
