'use client';

import React from 'react';
import {
  Clock,
  ChefHat,
  Radio,
  Bike,
  CheckCircle2,
  AlertCircle,
  Timer,
} from 'lucide-react';
import type { OrderStatusBannerProps } from '../types';

export function OrderStatusBanner({
  status,
  estimatedDeliveryTime,
}: OrderStatusBannerProps) {
  switch (status) {
    case 'PENDING':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-amber-500/8 border border-amber-500/25 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full mb-1">
                Bước 1 / 4 • Chờ xác nhận
              </span>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Đang chờ nhà hàng nhận đơn
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Hệ thống đã tiếp nhận đơn và chuyển thông tin đến nhà hàng. Quán sẽ sớm xác nhận và nấu món cho bạn.
              </p>
            </div>
          </div>
        </div>
      );

    case 'COOKING':
    case 'ACCEPTED':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-sky-500/8 border border-sky-500/25 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
              <ChefHat className="w-6 h-6 text-sky-600 dark:text-sky-400 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-sky-700 dark:text-sky-300 bg-sky-500/15 px-2.5 py-0.5 rounded-full mb-1">
                  Bước 2 / 4 • Bếp đang nấu
                </span>
                {estimatedDeliveryTime && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-foreground bg-card border border-border px-2.5 py-0.5 rounded-full mb-1 font-medium">
                    <Timer className="w-3 h-3 text-primary" />
                    Dự kiến: {estimatedDeliveryTime}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Đầu bếp đang chuẩn bị món ăn
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Nhà hàng đã nhận đơn và đang chế biến các món ăn nóng hổi theo yêu cầu của bạn.
              </p>
            </div>
          </div>
        </div>
      );

    case 'READY_FOR_PICKUP':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-indigo-500/8 border border-indigo-500/25 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="relative w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span className="absolute -inset-1 rounded-2xl border-2 border-indigo-500/40 animate-ping opacity-75" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-full mb-1">
                Bước 3 / 4 • Điều phối tài xế
              </span>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Món ăn đã xong • Đang tìm tài xế gần nhất
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Bếp đã hoàn tất đóng gói. Hệ thống đang phát tín hiệu điều phối tài xế gần quán nhất tới lấy món.
              </p>
            </div>
          </div>
        </div>
      );

    case 'DELIVERING':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-primary/10 border border-primary/25 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Bike className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/15 px-2.5 py-0.5 rounded-full mb-1">
                  Bước 4 / 4 • Đang giao hàng
                </span>
                {estimatedDeliveryTime && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary bg-card border border-primary/25 px-2.5 py-0.5 rounded-full mb-1 font-semibold">
                    <Timer className="w-3 h-3" />
                    Đến nơi sau: {estimatedDeliveryTime}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Tài xế đang trên đường giao đến bạn!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Tài xế đã nhận món ăn từ quán và đang di chuyển tới địa chỉ nhận. Hãy chú ý điện thoại nhé!
              </p>
            </div>
          </div>
        </div>
      );

    case 'COMPLETED':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-primary/12 border border-primary/30 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/15 px-2.5 py-0.5 rounded-full mb-1">
                Hoàn thành xuất sắc
              </span>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Đơn hàng đã được giao thành công!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Cảm ơn bạn đã lựa chọn FoodDelivery. Chúc bạn có một bữa ăn ngon miệng và hài lòng!
              </p>
            </div>
          </div>
        </div>
      );

    case 'CANCELLED':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-destructive/10 border border-destructive/25 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-destructive bg-destructive/15 px-2.5 py-0.5 rounded-full mb-1">
                Đơn đã hủy
              </span>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Đơn hàng đã bị hủy
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Đơn hàng này đã kết thúc. Nếu bạn đã thanh toán qua Ví điện tử hoặc thẻ, tiền sẽ được hoàn trả tự động.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
