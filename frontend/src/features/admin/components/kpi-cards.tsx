'use client';

import React from 'react';
import { DollarSign, Wallet, ShoppingBag, Store, Bike } from 'lucide-react';
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
  const cards = [
    {
      label: 'Tổng GMV Hệ Thống',
      value: formatVND(metrics?.totalGmv || 0),
      description: 'Tổng giá trị giao dịch',
      icon: DollarSign,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      label: 'Doanh Thu Sàn Ròng',
      value: formatVND(metrics?.treasuryBalance || metrics?.totalRevenue || 0),
      description: 'Số dư ví hoa hồng sàn',
      icon: Wallet,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Tổng Đơn Hàng',
      value: new Intl.NumberFormat('vi-VN').format(metrics?.totalOrders || 0),
      description: 'Đơn hàng phát sinh',
      icon: ShoppingBag,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Nhà Hàng Đối Tác',
      value: new Intl.NumberFormat('vi-VN').format(metrics?.totalRestaurants || 0),
      description: 'Quán ăn đang mở bán',
      icon: Store,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Tài Xế Hoạt Động',
      value: new Intl.NumberFormat('vi-VN').format(metrics?.totalDrivers || 0),
      description: 'Đối tác tài xế giao hàng',
      icon: Bike,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-zinc-900 border ${card.border} rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-300`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-400">{card.label}</p>
              <p className="text-xl font-bold text-white tracking-tight mt-1 truncate" title={card.value}>
                {card.value}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
