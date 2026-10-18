'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Flame,
  PackageCheck,
  Bike,
  Navigation,
  UtensilsCrossed,
  Loader2,
  Receipt,
  ChefHat,
  Info,
} from 'lucide-react';
import type { PartnerOrder } from '@/features/restaurant/api/partner-api';

interface OrderDetailDialogProps {
  order: PartnerOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: 'COOKING' | 'READY_FOR_PICKUP') => Promise<void>;
  onSelectItem?: (
    menuItemId: string,
    itemName?: string,
    options?: string[],
    notes?: string,
    orderNote?: string | null,
  ) => void;
  isUpdating?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatTime = (dateInput?: string | Date | null) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateInput?: string | Date | null) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
};

export function OrderDetailDialog({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onSelectItem,
  isUpdating = false,
}: OrderDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPending = order.status === 'PENDING';
  const isCooking = order.status === 'COOKING';
  const isReady = order.status === 'READY_FOR_PICKUP';
  const isDelivering = order.status === 'DELIVERING';
  const isCompleted = order.status === 'COMPLETED';

  const getStatusBadge = () => {
    switch (order.status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Chờ quán nhận
          </span>
        );
      case 'COOKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Flame className="w-3.5 h-3.5" />
            Đang nấu món
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Bike className="w-3.5 h-3.5 animate-pulse" />
            Đã xong - Tìm xế
          </span>
        );
      case 'DELIVERING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Navigation className="w-3.5 h-3.5 animate-pulse" />
            Tài xế đang giao
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Giao thành công
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {order.status}
          </span>
        );
    }
  };

  // Milestones timeline definition
  const milestones = [
    {
      label: 'Khách đặt đơn',
      time: order.created_at,
      reached: true,
      color: 'emerald',
    },
    {
      label: 'Bếp bắt đầu nấu',
      time: order.cooking_at,
      reached: Boolean(order.cooking_at || isCooking || isReady || isDelivering || isCompleted),
      color: 'purple',
    },
    {
      label: 'Món nấu xong',
      time: order.ready_at,
      reached: Boolean(order.ready_at || isReady || isDelivering || isCompleted),
      color: 'blue',
    },
    {
      label: 'Tài xế lấy món',
      time: order.driver_claimed_at,
      reached: Boolean(order.driver_claimed_at || isDelivering || isCompleted),
      color: 'amber',
    },
    {
      label: 'Hoàn tất giao',
      time: order.completed_at,
      reached: Boolean(order.completed_at || isCompleted),
      color: 'emerald',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Shell */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-zinc-900/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">#{order.id.slice(0, 8)}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Sao chép toàn bộ mã đơn"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Đặt lúc: {formatTime(order.created_at)} - {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Milestones Stepper Timeline */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Tiến trình luân chuyển đơn hàng</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {milestones.map((m, idx) => {
                const timeStr = formatTime(m.time);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${m.reached
                        ? 'bg-zinc-900 border-white/15 text-white'
                        : 'bg-zinc-950/40 border-white/5 text-zinc-500 opacity-60'
                      }`}
                  >
                    <span className="text-[11px] font-medium leading-tight">{m.label}</span>
                    <span className="text-xs font-mono font-bold mt-2 text-zinc-300">
                      {timeStr || '--:--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Special Note (Callout) */}
          {order.note && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <ChefHat className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Ghi chú của khách hàng:
                </h5>
                <p className="text-sm font-medium text-amber-100 mt-1 leading-relaxed">
                  &ldquo;{order.note}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Items Breakdown Table */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-500" />
                <span>Danh sách món ăn ({order.items?.length || 0})</span>
              </h4>
              <span className="text-[11px] text-zinc-500 italic">Nhấn vào món để xem ảnh/mô tả</span>
            </div>

            <div className="space-y-2">
              {order.items?.map((item, idx) => {
                const subtotal = item.unit_price * item.quantity;
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      onSelectItem?.(
                        item.menu_item_id,
                        item.name,
                        item.options,
                        item.notes,
                        order.note,
                      )
                    }
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group"
                    title="Bấm để xem chi tiết món ăn và yêu cầu khách hàng"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {item.quantity}x
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors block truncate">
                          {item.name || `Món ăn #${item.menu_item_id.slice(0, 6)}`}
                        </span>

                        {/* Customization options badges */}
                        {item.options && item.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.options.map((opt, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.notes && (!item.options || !item.options.includes(item.notes)) && (
                          <span className="text-[11px] text-amber-200/80 italic block mt-0.5">
                            Ghi chú: {item.notes}
                          </span>
                        )}

                        <span className="text-xs text-zinc-500 font-mono block mt-0.5">
                          Đơn giá: {formatCurrency(item.unit_price)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="text-sm font-mono font-bold text-white block">
                        {formatCurrency(subtotal)}
                      </span>
                      <span className="text-[10px] text-orange-400 group-hover:underline flex items-center justify-end gap-1">
                        <Info className="w-3 h-3" /> Chi tiết
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Destination Address */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <span>Địa chỉ giao nhận cho khách</span>
            </h4>
            <p className="text-sm text-zinc-200 leading-relaxed font-medium">
              {order.delivery_address || 'Địa chỉ đang cập nhật...'}
            </p>
          </div>
        </div>

        {/* Footer Financials & Contextual Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Tiền món:</span>
              <span className="font-semibold text-zinc-200">
                {formatCurrency(Number(order.subtotal) || (Number(order.total_amount) > 15000 ? Number(order.total_amount) - 15000 : Number(order.total_amount)))}
              </span>
              <span className="text-emerald-400 font-semibold">
                (Thực nhận 80%: {formatCurrency(Math.round((Number(order.subtotal) || (Number(order.total_amount) > 15000 ? Number(order.total_amount) - 15000 : Number(order.total_amount))) * 0.8))})
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-400">Tổng khách trả:</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPending && onUpdateStatus && (
              <button
                onClick={() => onUpdateStatus(order.id, 'COOKING')}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs transition-all shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                <span>Nhận đơn & Nấu món</span>
              </button>
            )}

            {isCooking && onUpdateStatus && (
              <button
                onClick={() => onUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>Món đã xong - Tìm tài xế</span>
              </button>
            )}

            {isReady && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                <Bike className="w-4 h-4 animate-bounce" />
                <span>Đang điều phối tìm tài xế...</span>
              </div>
            )}

            {isDelivering && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>Tài xế đang trên đường giao</span>
              </div>
            )}

            {isCompleted && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đơn hàng đã hoàn tất</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
