'use client';

import React from 'react';
import { DollarSign, Wallet, ShoppingBag, Store, Bike } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card/kpi-card';
import { AdminMetrics } from '@/features/admin/types';

interface KpiCardsProps {
  metrics: AdminMetrics | null;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        title="Tổng GMV Hệ Thống"
        value={formatVND(metrics?.totalGmv || 0)}
        subtitle="Tổng giá trị giao dịch"
        icon={DollarSign}
        tone="primary"
      />
      <KpiCard
        title="Doanh Thu Sàn Ròng"
        value={formatVND(metrics?.treasuryBalance || metrics?.totalRevenue || 0)}
        subtitle="Số dư ví hoa hồng sàn"
        icon={Wallet}
        tone="primary"
      />
      <KpiCard
        title="Tổng Đơn Hàng"
        value={new Intl.NumberFormat('vi-VN').format(metrics?.totalOrders || 0)}
        subtitle="Đơn hàng phát sinh"
        icon={ShoppingBag}
        tone="info"
      />
      <KpiCard
        title="Nhà Hàng Đối Tác"
        value={new Intl.NumberFormat('vi-VN').format(metrics?.totalRestaurants || 0)}
        subtitle="Quán ăn đang mở bán"
        icon={Store}
        tone="info"
      />
      <KpiCard
        title="Tài Xế Hoạt Động"
        value={new Intl.NumberFormat('vi-VN').format(metrics?.totalDrivers || 0)}
        subtitle="Đối tác tài xế giao hàng"
        icon={Bike}
        tone="warning"
      />
    </div>
  );
};
