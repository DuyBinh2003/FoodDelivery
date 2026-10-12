'use client';

import React from 'react';
import { DollarSign, CheckCircle2, Star, Calendar } from 'lucide-react';
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
  const cards = [
    {
      title: 'Tổng Thu Nhập',
      value: summary ? formatCurrency(summary.total_earnings) : '0 ₫',
      subtitle: `${summary?.completed_trips || 0} cuốc xe đã hoàn thành`,
      icon: DollarSign,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Hôm Nay',
      value: summary ? formatCurrency(summary.today_earnings) : '0 ₫',
      subtitle: `${summary?.today_trips || 0} chuyến trong ngày`,
      icon: Calendar,
      color: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Tổng Số Cuốc',
      value: summary ? `${summary.total_trips}` : '0',
      subtitle: `${summary?.completed_trips || 0} cuốc thành công`,
      icon: CheckCircle2,
      color: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Đánh Giá Tài Xế',
      value: summary?.average_rating ? `${summary.average_rating.toFixed(1)} ★` : '5.0 ★',
      subtitle: `${summary?.total_reviews || 0} lượt khách đánh giá`,
      icon: Star,
      color: 'from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden bg-zinc-900/80 border ${card.borderColor} rounded-2xl p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/20`}
          >
            {/* Top gradient blur */}
            <div
              className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${card.color} blur-2xl pointer-events-none`}
            />

            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center ${card.iconColor}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="relative z-10">
              {loading ? (
                <div className="h-7 w-28 bg-white/5 rounded animate-pulse my-1" />
              ) : (
                <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              )}
              <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
