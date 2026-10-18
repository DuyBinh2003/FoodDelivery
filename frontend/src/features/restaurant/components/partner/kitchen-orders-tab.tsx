'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Eye,
} from 'lucide-react';
import {
  getRestaurantOrders,
  updateOrderStatus,
  type PartnerOrder,
} from '@/features/restaurant/api/partner-api';
import type { PartnerMenuItem } from '@/features/restaurant/types/partner.types';
import { OrderDetailDialog } from '@/features/restaurant/components/partner/order-detail-dialog';
import { FoodItemDetailDialog } from '@/features/restaurant/components/partner/food-item-detail-dialog';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { getErrorMessage } from '@/lib/error-handler';

interface KitchenOrdersTabProps {
  restaurantId: string;
  showToast: (type: 'success' | 'error', text: string) => void;
  menuItems?: PartnerMenuItem[];
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

export function KitchenOrdersTab({ restaurantId, showToast, menuItems }: KitchenOrdersTabProps) {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COOKING' | 'READY_FOR_PICKUP' | 'COMPLETED'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState<PartnerMenuItem | null>(null);
  const [foodItemContext, setFoodItemContext] = useState<{
    customerComment?: string | null;
    customerOptions?: string[] | null;
    orderId?: string | null;
  }>({});

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const enrichOrders = useCallback(
    (rawOrders: PartnerOrder[]): PartnerOrder[] => {
      return rawOrders.map((order) => ({
        ...order,
        items: order.items.map((i) => {
          const resolvedName =
            i.name && !i.name.startsWith('Món ăn #')
              ? i.name
              : menuItems?.find((m) => m.id === i.menu_item_id)?.name ||
                i.name ||
                `Món ăn #${i.menu_item_id ? i.menu_item_id.slice(0, 6) : ''}`;
          return {
            ...i,
            name: resolvedName,
          };
        }),
      }));
    },
    [menuItems],
  );

  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null);
      const data = await getRestaurantOrders(restaurantId);
      setOrders(enrichOrders(data));
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể tải danh sách đơn hàng của quán');
      setFetchError(msg);
      showToastRef.current('error', msg);
    }
  }, [restaurantId, enrichOrders]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    let ignore = false;
    const loadInitial = async () => {
      try {
        setFetchError(null);
        const data = await getRestaurantOrders(restaurantId);
        if (!ignore) {
          setOrders(enrichOrders(data));
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          const msg = getErrorMessage(err, 'Không thể tải danh sách đơn hàng của quán');
          setFetchError(msg);
          setLoading(false);
        }
      }
    };

    void loadInitial();

    // Tự động kiểm tra đơn mới mỗi 15 giây
    const interval = setInterval(() => {
      void fetchOrdersRef.current();
    }, 15000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [restaurantId, enrichOrders]);


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
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: nextStatus } : prev));
    } catch {
      showToast('error', 'Cập nhật trạng thái đơn hàng thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleItemClick = (
    menuItemId: string,
    itemName?: string,
    options?: string[],
    notes?: string,
    orderNote?: string | null,
    orderId?: string | null,
  ) => {
    const found = menuItems?.find((m) => m.id === menuItemId);
    if (found) {
      setSelectedFoodItem(found);
    } else {
      setSelectedFoodItem({
        id: menuItemId,
        restaurant_id: restaurantId,
        name: itemName || `Món ăn #${menuItemId ? menuItemId.slice(0, 6) : ''}`,
        price: 0,
        is_available: true,
      });
    }

    const effectiveComment = orderNote || notes || '';
    const effectiveOptions = options && options.length > 0 ? options : [];

    setFoodItemContext({
      customerComment: effectiveComment,
      customerOptions: effectiveOptions,
      orderId: orderId || null,
    });
  };

  const enrichedOrders = useMemo(() => enrichOrders(orders), [orders, enrichOrders]);

  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter((order) => {
      if (statusFilter === 'ALL') return true;
      return order.status === statusFilter;
    });
  }, [enrichedOrders, statusFilter]);

  const pendingCount = enrichedOrders.filter((o) => o.status === 'PENDING').length;
  const cookingCount = enrichedOrders.filter((o) => o.status === 'COOKING').length;
  const readyCount = enrichedOrders.filter((o) => o.status === 'READY_FOR_PICKUP').length;

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
      ) : fetchError && orders.length === 0 ? (
        <ErrorState
          title="Không thể tải danh sách đơn hàng"
          description={fetchError}
          onRetry={fetchOrders}
          retryText="Tải lại đơn hàng"
        />
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
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      title="Xem chi tiết đơn hàng"
                    >
                      <Eye className="w-3.5 h-3.5 text-orange-400" />
                      <span>Chi tiết</span>
                    </button>
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
                      <div
                        key={idx}
                        onClick={() =>
                          handleItemClick(
                            item.menu_item_id,
                            item.name,
                            item.options,
                            item.notes,
                            order.note,
                            order.id,
                          )
                        }
                        className="flex items-start justify-between text-sm p-2 -mx-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                        title="Bấm để xem ảnh, thành phần và yêu cầu khách hàng"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {item.quantity}x
                          </span>
                          <div className="min-w-0">
                            <span className="text-zinc-200 font-medium group-hover:text-orange-400 transition-colors block truncate">
                              {item.name || `Món ăn #${item.menu_item_id.slice(0, 6)}`}
                            </span>

                            {/* Customer customization options */}
                            {item.options && item.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.options.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  >
                                    ⚡ {opt}
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.notes && (!item.options || !item.options.includes(item.notes)) && (
                              <span className="text-[11px] text-amber-200/80 italic block mt-0.5">
                                Ghi chú: {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-zinc-400 font-mono text-xs shrink-0 ml-2 group-hover:text-zinc-300 mt-0.5">
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

      {/* Detail Popups */}
      <OrderDetailDialog
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
        onSelectItem={(menuItemId, itemName, options, notes, orderNote) =>
          handleItemClick(
            menuItemId,
            itemName,
            options,
            notes,
            orderNote,
            selectedOrder?.id,
          )
        }
        isUpdating={Boolean(updatingId)}
      />

      <FoodItemDetailDialog
        item={selectedFoodItem}
        isOpen={Boolean(selectedFoodItem)}
        onClose={() => {
          setSelectedFoodItem(null);
          setFoodItemContext({});
        }}
        customerComment={foodItemContext.customerComment}
        customerOptions={foodItemContext.customerOptions}
        orderId={foodItemContext.orderId}
      />
    </div>
  );
}
