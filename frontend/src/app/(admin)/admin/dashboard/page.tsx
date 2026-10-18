'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertTriangle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { adminApi } from '@/features/admin/api/admin-api';
import { KpiCards } from '@/features/admin/components/kpi-cards';
import { AnalyticsCharts } from '@/features/admin/components/analytics-charts';
import { AdminAnalyticsResponse } from '@/features/admin/types';

export default function AdminDashboardPage() {
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');

  const {
    data: analytics,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<AdminAnalyticsResponse>({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => adminApi.getAnalytics(range),
    refetchInterval: 30000, // 30s auto background refresh
  });

  const handleRefresh = () => {
    refetch();
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header with Time Range Switcher & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Bảng Điều Khiển Quản Trị</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime Sync
            </div>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Tổng quan dữ liệu vận hành, doanh thu sàn, chiết khấu và biểu đồ phân tích thời gian thực.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Range Switcher */}
          <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === '7d'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === '30d'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              30 ngày qua
            </button>
            <button
              onClick={() => setRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === 'all'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Graceful Degradation Warning Banner if realtime degraded */}
      {analytics?.isRealtimeDegraded && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <p>
            Dịch vụ phân tích thời gian thực từ Order Service tạm thời gián đoạn. Hệ thống đang hiển thị dữ liệu lưu đệm gần nhất mà không làm ảnh hưởng trải nghiệm.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>Không thể tải dữ liệu Dashboard: {(error as Error)?.message || 'Vui lòng thử lại sau.'}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !analytics ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-zinc-400 text-sm">Đang tải và trực quan hóa dữ liệu hệ thống...</p>
        </div>
      ) : (
        <>
          {/* 5 KPI Hero Cards */}
          <KpiCards metrics={analytics?.metrics || null} />

          {/* Visualized Recharts */}
          <AnalyticsCharts
            timeseries={analytics?.timeseries || []}
            revenueBreakdown={analytics?.revenueBreakdown || []}
            statusDistribution={analytics?.statusDistribution || {}}
          />

          {/* Recent Treasury Transactions Mini-Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">Biến Động Số Dư & Hoa Hồng Mới Nhất</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Các bút toán ghi có vào ví sàn từ chiết khấu nhà hàng và tài xế.</p>
              </div>
              <Link
                href="/admin/wallet"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
              >
                <span>Xem chi tiết sổ cái</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900/90 border-b border-zinc-800 uppercase tracking-wider text-zinc-400 font-semibold">
                    <th className="px-6 py-3.5">Mã Bút Toán</th>
                    <th className="px-6 py-3.5">Loại Nghiệp Vụ</th>
                    <th className="px-6 py-3.5">Mô Tả Giao Dịch</th>
                    <th className="px-6 py-3.5">Số Tiền (VND)</th>
                    <th className="px-6 py-3.5">Số Dư Sau</th>
                    <th className="px-6 py-3.5 text-right">Thời Gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(!analytics?.recentTreasuryTransactions || analytics.recentTreasuryTransactions.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        Chưa có bút toán hoa hồng nào phát sinh trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    analytics.recentTreasuryTransactions.slice(0, 5).map((txn) => (
                      <tr key={txn.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-zinc-300">{txn.transaction_code}</td>
                        <td className="px-6 py-3.5">
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
                        <td className="px-6 py-3.5 text-zinc-300 max-w-xs truncate">{txn.description}</td>
                        <td className="px-6 py-3.5 font-semibold text-emerald-400">
                          +{formatVND(txn.amount)}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-400 font-medium">
                          {formatVND(txn.balance_after)}
                        </td>
                        <td className="px-6 py-3.5 text-right text-zinc-400">
                          {new Date(txn.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {new Date(txn.created_at).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
