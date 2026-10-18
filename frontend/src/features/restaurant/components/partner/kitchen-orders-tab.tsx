'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Bike,
  UtensilsCrossed,
  Flame,
  PackageCheck,
  Loader2,
} from 'lucide-react';
import {
  getRestaurantOrders,
  updateOrderStatus,
  type PartnerOrder,
} from '@/features/restaurant/api/partner-api';

interface KitchenOrdersTabProps {
  restaurantId: string;
  showToast: (type: 'success' | 'error', text: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const formatTime = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getKitchenMilestoneBadge = (order: PartnerOrder) => {
  if (order.status === 'COMPLETED' && order.completed_at) {
    return (
      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
        Xong: {formatTime(order.completed_at)}
      </span>
    );
  }
  if (order.status === 'DELIVERING' && order.driver_claimed_at) {
    return (
      <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
        Xế nhận lúc: {formatTime(order.driver_claimed_at)}
      </span>
    );
  }
  if (order.status === 'READY_FOR_PICKUP' && order.ready_at) {
    return (
      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
        Xong món: {formatTime(order.ready_at)}
      </span>
    );
  }
  if (order.status === 'COOKING' && order.cooking_at) {
    return (
      <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
        Bếp nấu lúc: {formatTime(order.cooking_at)}
      </span>
    );
  }
  return null;
};

export function KitchenOrdersTab({ restaurantId, showToast }: KitchenOrdersTabProps) {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COOKING' | 'READY_FOR_PICKUP' | 'COMPLETED'>('ALL');

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getRestaurantOrders(restaurantId);
      setOrders(data);
    } catch {
      showToast('error', 'Không thể tải danh sách đơn hàng của quán');
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    let ignore = false;
    const loadInitial = async () => {
      try {
        const data = await getRestaurantOrders(restaurantId);
        if (!ignore) {
          setOrders(data);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          showToast('error', 'Không thể tải danh sách đơn hàng của quán');
          setLoading(false);
        }
      }
    };

    void loadInitial();

    // Tự động kiểm tra đơn mới mỗi 15 giây
    const interval = setInterval(() => {
      void fetchOrders();
    }, 15000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [restaurantId, fetchOrders, showToast]);

  const handleUpdateStatus = async (orderId: string, nextStatus: 'COOKING' | 'READY_FOR_PICKUP') => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, nextStatus);

      if (nextStatus === 'COOKING') {
        showToast('success', 'Đã nhận đơn! Bếp bắt đầu chuẩn bị món ăn.');
      } else if (nextStatus === 'READY_FOR_PICKUP') {
        showToast('success', 'Món đã xong! Đã phát tín hiệu tìm tài xế gần nhất.');
      }

      await fetchOrders();
    } catch {
      showToast('error', 'Cập nhật trạng thái đơn hàng thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') return true;
    return order.status === statusFilter;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const cookingCount = orders.filter((o) => o.status === 'COOKING').length;
  const readyCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Đơn mới chờ nhận
          </span>
        );
      case 'COOKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame className="w-3.5 h-3.5" />
            Đang nấu tại bếp
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Bike className="w-3.5 h-3.5" />
            Chờ tài xế lấy
          </span>
        );
      case 'DELIVERING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Bike className="w-3.5 h-3.5" />
            Đang đi giao
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn tất
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Đơn Chờ Nhận</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{pendingCount}</div>
          <p className="text-xs text-zinc-400 mt-1">Cần bếp xác nhận nhận đơn</p>
        </div>

        <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Đang Nấu</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{cookingCount}</div>
          <p className="text-xs text-zinc-400 mt-1">Bếp đang chuẩn bị món</p>
        </div>

        <div className="bg-zinc-900/80 border border-blue-500/20 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Chờ Tài Xế</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{readyCount}</div>
          <p className="text-xs text-zinc-400 mt-1">Món xong, đang điều phối xe</p>
        </div>
      </div>

      {/* Filter Tabs & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'ALL', label: `Tất cả (${orders.length})` },
              { key: 'PENDING', label: `Chờ nhận (${pendingCount})` },
              { key: 'COOKING', label: `Đang nấu (${cookingCount})` },
              { key: 'READY_FOR_PICKUP', label: `Chờ lấy (${readyCount})` },
              { key: 'COMPLETED', label: 'Lịch sử' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
          <p className="text-sm">Đang tải danh sách đơn hàng của quán...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/40 border border-white/5 rounded-3xl">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-zinc-300 mb-1">Hiện không có đơn hàng nào</h3>
          <p className="text-xs text-zinc-500">Đơn hàng mới từ khách hàng sẽ tự động xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isCooking = order.status === 'COOKING';
            const isReady = order.status === 'READY_FOR_PICKUP';
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-zinc-900/90 border border-white/10 hover:border-white/20 rounded-2xl p-5 shadow-xl transition-all"
              >
                {/* Header: ID, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatDate(order.created_at)}
                    </span>
                    {getKitchenMilestoneBadge(order)}
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Items and Notes */}
                <div className="py-4 space-y-3">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-orange-400 font-bold text-xs flex items-center justify-center">
                            {item.quantity}x
                          </span>
                          <span className="text-zinc-200 font-medium">
                            {item.name || `Món ăn #${item.menu_item_id.slice(0, 6)}`}
                          </span>
                        </div>
                        <span className="text-zinc-400 font-mono text-xs">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.note && (
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-2.5 text-xs text-amber-300">
                      <strong className="font-semibold">Ghi chú của khách:</strong> {order.note}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{order.delivery_address}</span>
                  </div>
                </div>

                {/* Footer: Total & Action Button */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-zinc-400 block">Tổng tiền thu khách</span>
                    <span className="text-lg font-extrabold text-white font-mono">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  {/* Contextual Actions */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COOKING')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs transition-all shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Flame className="w-3.5 h-3.5" />
                        )}
                        <span>Nhận đơn & Nấu</span>
                      </button>
                    )}

                    {isCooking && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PackageCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Món đã xong - Tìm tài xế</span>
                      </button>
                    )}

                    {isReady && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                        <Bike className="w-3.5 h-3.5 animate-bounce" />
                        <span>Đang tìm tài xế giao hàng...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
