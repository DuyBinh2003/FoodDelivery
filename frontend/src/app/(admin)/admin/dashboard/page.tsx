'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Users, Store, Bike, DollarSign } from 'lucide-react';

interface Metrics {
  totalUsers: number;
  totalRestaurants: number;
  totalDrivers: number;
  totalOrders: number;
  totalGmv: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await apiClient.get('/admin/metrics/dashboard');
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const cards = [
    { label: 'Tổng số người dùng', value: metrics?.totalUsers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Tổng nhà hàng', value: metrics?.totalRestaurants || 0, icon: Store, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Tổng tài xế', value: metrics?.totalDrivers || 0, icon: Bike, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Tổng Đơn Hàng', value: metrics?.totalOrders || 0, icon: Store, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { 
      label: 'Tổng GMV (VND)', 
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(metrics?.totalGmv || 0), 
      icon: DollarSign, 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10' 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Tổng quan các chỉ số hoạt động của hệ thống.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/20 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110`}></div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">{card.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
