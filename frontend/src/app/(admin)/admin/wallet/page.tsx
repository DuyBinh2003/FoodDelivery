'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Store, Bike, RefreshCw, FileText, CheckCircle2, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin-api';
import { PlatformTreasurySummary, TreasuryTransactionItem } from '@/features/admin/types';

export default function AdminWalletPage() {
  const [page, setPage] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState<TreasuryTransactionItem | null>(null);

  const {
    data: treasury,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<PlatformTreasurySummary>({
    queryKey: ['admin', 'wallet', page],
    queryFn: () => adminApi.getWalletSummary(page, 15),
  });

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalPages = Math.ceil((treasury?.total_transactions_count || 0) / 15) || 1;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Ví Doanh Thu Nền Tảng (Treasury Wallet)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Double-Entry Ledger
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Quản lý số dư hoa hồng sàn, dòng tiền chiết khấu tự động từ đơn quán ăn và các cuốc xe tài xế.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
          <span>Làm mới số dư</span>
        </button>
      </div>

      {/* FinTech Treasury Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Treasury Card */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/40 border border-orange-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-orange-400">
              Platform Treasury Account
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/30">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs text-zinc-400 font-medium">Số dư khả dụng hiện tại</p>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-1">
              {formatVND(treasury?.available_balance || 0)}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono">{treasury?.account_code || 'SYS_REVENUE_PLATFORM_COMMISSION'}</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Khóa Bi Quan (Active)
            </span>
          </div>
        </div>

        {/* Restaurant Commission Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Chiết khấu từ Nhà hàng</span>
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight mt-3">
              {formatVND(treasury?.restaurant_commission_revenue || 0)}
            </p>
          </div>
          <p className="text-xs text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
            Tự động trích 15-20% giá trị món khi khách hàng thanh toán đơn hàng.
          </p>
        </div>

        {/* Driver Trip Commission Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Chiết khấu từ Cuốc xe Tài xế</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Bike className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight mt-3">
              {formatVND(treasury?.driver_trip_commission_revenue || 0)}
            </p>
          </div>
          <p className="text-xs text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
            Tự động trích 10% cước phí giao hàng khi tài xế giao đơn thành công (COMPLETED).
          </p>
        </div>
      </div>

      {/* Double-Entry Ledger Transactions Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Sổ Cái Kế Toán Kép (Double-Entry Ledger)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Danh sách chi tiết toàn bộ các bút toán phát sinh ghi nhận vào tài khoản doanh thu nền tảng.
            </p>
          </div>
          <div className="text-xs text-zinc-400 font-medium">
            Tổng cộng: <span className="text-white font-semibold">{treasury?.total_transactions_count || 0}</span> bút toán
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/90 border-b border-zinc-800 uppercase tracking-wider text-zinc-400 font-semibold">
                <th className="px-6 py-4">Mã Bút Toán</th>
                <th className="px-6 py-4">Loại Nghiệp Vụ</th>
                <th className="px-6 py-4">Mã Tham Chiếu</th>
                <th className="px-6 py-4">Mô Tả Giao Dịch</th>
                <th className="px-6 py-4">Số Tiền (VND)</th>
                <th className="px-6 py-4">Số Dư Sau</th>
                <th className="px-6 py-4">Thời Gian</th>
                <th className="px-6 py-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-zinc-400">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                    Đang tải danh sách bút toán sổ cái...
                  </td>
                </tr>
              ) : (!treasury?.recent_transactions || treasury.recent_transactions.length === 0) ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-zinc-500">
                    Chưa có giao dịch sổ cái nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                treasury.recent_transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-zinc-200 font-medium">{txn.transaction_code}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          txn.reference_type === 'ORDER_SETTLEMENT'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {txn.reference_type === 'ORDER_SETTLEMENT' ? 'Chiết khấu Đơn Quán' : 'Chiết khấu Cuốc Xe'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-400 text-[11px]">{txn.reference_id}</td>
                    <td className="px-6 py-4 text-zinc-300 max-w-xs truncate">{txn.description}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      +{formatVND(txn.amount)}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">
                      {formatVND(txn.balance_after)}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(txn.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-400" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Trang <span className="text-white font-medium">{page}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">Chi Tiết Bút Toán Sổ Cái</h3>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Mã bút toán:</span>
                <span className="font-mono text-zinc-200 font-semibold">{selectedTxn.transaction_code}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Loại nghiệp vụ:</span>
                <span className="text-orange-400 font-semibold">{selectedTxn.reference_type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Mã tham chiếu đơn hàng:</span>
                <span className="font-mono text-zinc-300">{selectedTxn.reference_id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Vế định khoản:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400">
                  CREDIT (Ghi Có Tăng Doanh Thu)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Số tiền trích hoa hồng:</span>
                <span className="text-sm font-bold text-emerald-400">+{formatVND(selectedTxn.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Số dư ví sàn sau bút toán:</span>
                <span className="text-sm font-bold text-white">{formatVND(selectedTxn.balance_after)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Thời gian ghi sổ:</span>
                <span className="text-zinc-300">{new Date(selectedTxn.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="pt-2">
                <span className="text-zinc-400 block mb-1">Mô tả hạch toán:</span>
                <p className="p-3 bg-zinc-950 rounded-xl text-zinc-300 border border-zinc-800 leading-relaxed">
                  {selectedTxn.description}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
