'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Users, Store, Bike, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    let active = true;

    apiClient<Metrics>('/admin/metrics/dashboard')
      .then((data) => {
        if (active) {
          setMetrics(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load metrics:', err);
          setError(err instanceof Error ? err.message : 'Không thể tải chỉ số hệ thống');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Tổng quan các chỉ số hoạt động của hệ thống.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors border border-zinc-700/50"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      )}

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
