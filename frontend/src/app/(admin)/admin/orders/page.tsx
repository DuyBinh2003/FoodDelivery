'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, RefreshCw, Eye, X, ChevronLeft, ChevronRight, Navigation, MapPin } from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin-api';
import { AdminOrder, AdminPaginatedResponse } from '@/features/admin/types';
import { PageSizeSelector } from '@/features/admin/components/page-size-selector';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ nhận' },
  { key: 'COOKING', label: 'Đang nấu' },
  { key: 'READY_FOR_PICKUP', label: 'Chờ lấy' },
  { key: 'DELIVERING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const {
    data: ordersResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AdminPaginatedResponse<AdminOrder>>({
    queryKey: ['admin', 'orders', status, search, page, pageSize],
    queryFn: () => adminApi.getOrders({ status, search, page, limit: pageSize }),
  });

  const formatVND = (value: number | string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DELIVERING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'COOKING':
      case 'READY_FOR_PICKUP':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getStatusLabel = (orderStatus: string) => {
    switch (orderStatus) {
      case 'COMPLETED':
        return 'Đã hoàn tất';
      case 'DELIVERING':
        return 'Đang giao hàng';
      case 'READY_FOR_PICKUP':
        return 'Chờ tài xế lấy';
      case 'COOKING':
        return 'Đang chế biến';
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return orderStatus;
    }
  };

  const totalPages = ordersResponse?.totalPages || 1;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Quản Lý Giao Dịch & Cuốc Xe</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Orders & Trips
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Theo dõi toàn bộ vòng đời đơn hàng, cước phí giao nhận, cự ly GPS và thông tin tài xế phụ trách.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                status === tab.key
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã đơn, địa chỉ..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/90 border-b border-zinc-800 uppercase tracking-wider text-zinc-400 font-semibold">
                <th className="px-6 py-4">Mã Đơn</th>
                <th className="px-6 py-4">Thời Gian</th>
                <th className="px-6 py-4">Địa Chỉ Giao Hàng</th>
                <th className="px-6 py-4">Cự Ly GPS</th>
                <th className="px-6 py-4">Tổng Tiền</th>
                <th className="px-6 py-4">Thanh Toán</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-zinc-400">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : (!ordersResponse?.data || ordersResponse.data.length === 0) ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-zinc-500">
                    Không tìm thấy đơn hàng nào phù hợp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                ordersResponse.data.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-zinc-200">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(order.created_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 max-w-xs truncate" title={order.delivery_address}>
                      {order.delivery_address}
                    </td>
                    <td className="px-6 py-4">
                      {order.distance_km ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Navigation className="w-3 h-3" />
                          {order.distance_km.toFixed(1)} km
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">Đang cập nhật</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {formatVND(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-400" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span>
              Tổng số <span className="text-white font-medium">{ordersResponse?.total || 0}</span> đơn hàng
            </span>
            <PageSizeSelector
              pageSize={pageSize}
              onChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-300 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">
                  Chi Tiết Đơn Hàng #{selectedOrder.id.slice(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block">Trạng thái:</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Phương thức thanh toán:</span>
                  <span className="font-semibold text-white mt-1 block">{selectedOrder.payment_method}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Thời gian đặt:</span>
                  <span className="text-zinc-300 mt-1 block">{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Cự ly di chuyển (GPS):</span>
                  <span className="font-semibold text-emerald-400 mt-1 block">
                    {selectedOrder.distance_km ? `${selectedOrder.distance_km.toFixed(1)} km` : 'Không xác định'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block font-medium mb-1">Địa chỉ giao hàng:</span>
                <div className="flex items-start gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-300">
                  <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <span>{selectedOrder.delivery_address}</span>
                </div>
              </div>

              {selectedOrder.note && (
                <div>
                  <span className="text-zinc-400 block font-medium mb-1">Ghi chú của khách:</span>
                  <p className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-300 italic">
                    {selectedOrder.note}
                  </p>
                </div>
              )}

              {/* Items List */}
              <div>
                <span className="text-zinc-400 block font-medium mb-2">Danh sách món ăn:</span>
                <div className="space-y-2">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px]">
                            {item.quantity}x
                          </span>
                          <span className="font-medium text-white">{item.item_name || item.name || 'Món ăn'}</span>
                        </div>
                        <span className="font-semibold text-zinc-300">
                          {formatVND(Number(item.total_price || (Number(item.unit_price || item.price) * item.quantity)))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
                      Không có chi tiết danh sách món kèm theo đơn.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-400">Tổng thanh toán:</span>
                <span className="text-lg font-bold text-orange-400">{formatVND(selectedOrder.total_amount)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
