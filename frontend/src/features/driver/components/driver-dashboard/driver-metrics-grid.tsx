'use client';

import React from 'react';
import { DollarSign, CheckCircle2, Star, Calendar } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card/kpi-card';
import type { DriverSummary } from '@/features/driver/types/driver.types';

interface DriverMetricsGridProps {
  summary: DriverSummary | null;
  loading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export function DriverMetricsGrid({ summary, loading }: DriverMetricsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Tổng Thu Nhập"
        value={summary ? formatCurrency(summary.total_earnings) : '0 ₫'}
        subtitle={`${summary?.completed_trips || 0} cuốc xe đã hoàn thành`}
        icon={DollarSign}
        tone="primary"
        loading={loading}
      />
      <KpiCard
        title="Hôm Nay"
        value={summary ? formatCurrency(summary.today_earnings) : '0 ₫'}
        subtitle={`${summary?.today_trips || 0} chuyến trong ngày`}
        icon={Calendar}
        tone="info"
        loading={loading}
      />
      <KpiCard
        title="Tổng Số Cuốc"
        value={summary ? `${summary.total_trips}` : '0'}
        subtitle={`${summary?.completed_trips || 0} cuốc thành công`}
        icon={CheckCircle2}
        tone="primary"
        loading={loading}
      />
      <KpiCard
        title="Đánh Giá Tài Xế"
        value={summary?.average_rating ? `${summary.average_rating.toFixed(1)} ★` : '5.0 ★'}
        subtitle={`${summary?.total_reviews || 0} lượt khách đánh giá`}
        icon={Star}
        tone="warning"
        loading={loading}
      />
    </div>
  );
}
