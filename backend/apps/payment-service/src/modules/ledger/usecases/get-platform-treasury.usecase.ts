import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { AccountCategory } from '@/modules/ledger/constants/ledger.enums.js';

export interface TreasuryEntryItem {
  id: string;
  transaction_code: string;
  reference_type: string;
  reference_id: string;
  description: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface PlatformTreasurySummary {
  account_id: string;
  account_code: string;
  currency: string;
  available_balance: number;
  total_revenue: number;
  restaurant_commission_revenue: number;
  driver_trip_commission_revenue: number;
  other_revenue: number;
  recent_transactions: TreasuryEntryItem[];
  total_transactions_count: number;
}

@Injectable()
export class GetPlatformTreasuryUseCase {
  private readonly logger = new Logger(GetPlatformTreasuryUseCase.name);

  constructor(
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(params?: { page?: number; limit?: number }): Promise<PlatformTreasurySummary> {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params?.limit) || 20));
    const offset = (page - 1) * limit;

    // 1. Lấy hoặc đảm bảo tài khoản nền tảng đã tồn tại
    const account = await this.walletWriteRepo.getOrCreateSystemAccount(
      'SYS_REVENUE_PLATFORM_COMMISSION',
      AccountCategory.REVENUE,
    );

    // 2. Lấy số dư hiện tại từ m_wallet_balance
    const balanceRecord = await this.walletReadRepo.getWalletBalance(account.id);
    const availableBalance = balanceRecord ? Number(balanceRecord.available_balance) : 0;

    // 3. Phân tích doanh thu từ các nguồn qua t_ledger_entry & t_ledger_transaction
    // Lưu ý: Tài khoản REVENUE được ghi có (CREDIT) khi doanh thu tăng
    const revenueStats = await this.dataSource.query(
      `
      SELECT 
        lt.reference_type,
        COALESCE(SUM(le.amount), 0) AS total_amount
      FROM schema_payment.t_ledger_entry le
      JOIN schema_payment.t_ledger_transaction lt ON le.ledger_transaction_id = lt.id
      WHERE le.wallet_account_id = $1 
        AND le.entry_type = 'CREDIT'
        AND le.is_deleted = false
      GROUP BY lt.reference_type
      `,
      [account.id],
    );

    let restaurantCommission = 0;
    let driverTripCommission = 0;
    let otherRevenue = 0;
    let totalRevenue = 0;

    for (const row of revenueStats) {
      const amt = Number(row.total_amount) || 0;
      totalRevenue += amt;
      if (row.reference_type === 'ORDER_SETTLEMENT') {
        restaurantCommission += amt;
      } else if (row.reference_type === 'COMMISSION_FEE') {
        driverTripCommission += amt;
      } else {
        otherRevenue += amt;
      }
    }

    // 4. Lấy danh sách giao dịch phân trang
    const totalCountRes = await this.dataSource.query(
      `
      SELECT COUNT(*)::int AS count
      FROM schema_payment.t_ledger_entry le
      WHERE le.wallet_account_id = $1 AND le.is_deleted = false
      `,
      [account.id],
    );
    const totalTransactionsCount = totalCountRes[0]?.count || 0;

    const entriesRows = await this.dataSource.query(
      `
      SELECT 
        le.id,
        lt.transaction_code,
        lt.reference_type,
        lt.reference_id,
        lt.description,
        le.entry_type,
        le.amount::numeric AS amount,
        le.balance_after::numeric AS balance_after,
        le.created_at
      FROM schema_payment.t_ledger_entry le
      JOIN schema_payment.t_ledger_transaction lt ON le.ledger_transaction_id = lt.id
      WHERE le.wallet_account_id = $1 AND le.is_deleted = false
      ORDER BY le.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [account.id, limit, offset],
    );

    const recentTransactions: TreasuryEntryItem[] = entriesRows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      transaction_code: String(r.transaction_code),
      reference_type: String(r.reference_type),
      reference_id: String(r.reference_id),
      description: String(r.description || ''),
      entry_type: String(r.entry_type),
      amount: Number(r.amount) || 0,
      balance_after: Number(r.balance_after) || 0,
      created_at: new Date(String(r.created_at)).toISOString(),
    }));

    return {
      account_id: account.id,
      account_code: account.account_code,
      currency: account.currency,
      available_balance: availableBalance,
      total_revenue: totalRevenue || availableBalance,
      restaurant_commission_revenue: restaurantCommission,
      driver_trip_commission_revenue: driverTripCommission,
      other_revenue: otherRevenue,
      recent_transactions: recentTransactions,
      total_transactions_count: totalTransactionsCount,
    };
  }
}
