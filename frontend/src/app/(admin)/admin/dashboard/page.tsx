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
    <div className="space-y-6 pb-12">
      {/* Page Header with Time Range Switcher & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Bảng Điều Khiển Quản Trị</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime Sync
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tổng quan dữ liệu vận hành, doanh thu sàn, chiết khấu và biểu đồ phân tích thời gian thực.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Range Switcher */}
          <div className="inline-flex p-1 bg-secondary/60 border border-border rounded-xl text-xs font-medium">
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                range === '7d'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                range === '30d'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30 ngày qua
            </button>
            <button
              onClick={() => setRange('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                range === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-secondary text-foreground rounded-xl text-xs font-medium transition-colors border border-border disabled:opacity-50 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Graceful Degradation Warning Banner if realtime degraded */}
      {analytics?.isRealtimeDegraded && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <p>
            Dịch vụ phân tích thời gian thực từ Order Service tạm thời gián đoạn. Hệ thống đang hiển thị dữ liệu lưu đệm gần nhất mà không làm ảnh hưởng trải nghiệm.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-between p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p>Không thể tải dữ liệu Dashboard: {(error as Error)?.message || 'Vui lòng thử lại sau.'}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-2.5 py-1 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !analytics ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-xs sm:text-sm">Đang tải và trực quan hóa dữ liệu hệ thống...</p>
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
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">Biến Động Số Dư & Hoa Hồng Mới Nhất</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Các bút toán ghi có vào ví sàn từ chiết khấu nhà hàng và tài xế.</p>
              </div>
              <Link
                href="/admin/wallet"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <span>Xem chi tiết sổ cái</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="px-5 py-3">Mã Bút Toán</th>
                    <th className="px-5 py-3">Loại Nghiệp Vụ</th>
                    <th className="px-5 py-3">Mô Tả Giao Dịch</th>
                    <th className="px-5 py-3">Số Tiền (VND)</th>
                    <th className="px-5 py-3">Số Dư Sau</th>
                    <th className="px-5 py-3 text-right">Thời Gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(!analytics?.recentTreasuryTransactions || analytics.recentTreasuryTransactions.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        Chưa có bút toán hoa hồng nào phát sinh trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    analytics.recentTreasuryTransactions.slice(0, 5).map((txn) => (
                      <tr key={txn.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3 font-mono text-foreground font-medium">{txn.transaction_code}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              txn.reference_type === 'ORDER_SETTLEMENT'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {txn.reference_type === 'ORDER_SETTLEMENT' ? 'Chiết khấu Đơn Quán' : 'Chiết khấu Cuốc Xe'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-foreground/90 max-w-xs truncate">{txn.description}</td>
                        <td className="px-5 py-3 font-semibold text-emerald-400 font-mono">
                          +{formatVND(txn.amount)}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground font-mono">
                          {formatVND(txn.balance_after)}
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground">
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
