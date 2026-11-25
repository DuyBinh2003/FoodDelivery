'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, XCircle, ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OrderActionBarProps } from '../types';

export function OrderActionBar({
  status,
  onCancel,
  isCancelling,
  onOpenReview,
  hasReview,
  onOpenDispute,
}: OrderActionBarProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <Link href="/history" className="w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto text-xs h-10 px-4 rounded-xl gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Lịch sử đơn hàng
        </Button>
      </Link>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
        {status === 'PENDING' && (
          <>
            {confirmCancel ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-destructive flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chắc chắn hủy?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="text-xs h-10 px-3.5 rounded-xl"
                >
                  {isCancelling ? 'Đang hủy...' : 'Đồng ý hủy'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmCancel(false)}
                  className="text-xs h-10 px-3 rounded-xl"
                >
                  Không
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmCancel(true)}
                className="w-full sm:w-auto text-xs h-10 px-4 rounded-xl gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Hủy đơn hàng
              </Button>
            )}
          </>
        )}

        {status === 'COMPLETED' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenReview}
            className="w-full sm:w-auto bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold text-xs h-10 px-4 rounded-xl gap-2"
          >
            <Star className="w-4 h-4 fill-current" />
            {hasReview ? 'Xem lại đánh giá' : 'Đánh giá đơn hàng'}
          </Button>
        )}

        {onOpenDispute && (status === 'DELIVERING' || status === 'COMPLETED' || status === 'CANCELLED') && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDispute}
            className="w-full sm:w-auto border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs h-10 px-3.5 rounded-xl gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Báo cáo sự cố
          </Button>
        )}

        <Link href="/" className="w-full sm:w-auto">
          <Button size="sm" className="w-full sm:w-auto text-xs h-10 px-4 rounded-xl gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt thêm món khác
          </Button>
        </Link>
      </div>
    </div>
  );
}
