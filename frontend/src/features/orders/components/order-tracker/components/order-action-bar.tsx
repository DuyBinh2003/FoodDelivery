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
}: OrderActionBarProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <Link href="/history" className="w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs h-10 px-4 rounded-xl gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Lịch sử đơn hàng
        </Button>
      </Link>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {/* Cancel Order Action - Only available when PENDING */}
        {status === 'PENDING' && (
          <>
            {confirmCancel ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chắc chắn hủy?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="bg-rose-600 hover:bg-rose-500 text-xs h-10 px-3.5 rounded-xl"
                >
                  {isCancelling ? 'Đang hủy...' : 'Đồng ý hủy'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmCancel(false)}
                  className="text-xs text-zinc-400 hover:text-white h-10 px-3 rounded-xl"
                >
                  Không
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancel(true)}
                className="w-full sm:w-auto border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 text-xs h-10 px-4 rounded-xl gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Hủy đơn hàng
              </Button>
            )}
          </>
        )}

        {/* Review Action - Available when COMPLETED */}
        {status === 'COMPLETED' && (
          <Button
            size="sm"
            onClick={onOpenReview}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-amber-500/20"
          >
            <Star className="w-4 h-4 fill-current" />
            {hasReview ? 'Xem lại đánh giá' : 'Đánh giá đơn hàng'}
          </Button>
        )}

        {/* Re-order link */}
        <Link href="/" className="w-full sm:w-auto">
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs h-10 px-4 rounded-xl gap-2 shadow-md shadow-orange-600/25"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt thêm món khác
          </Button>
        </Link>
      </div>
    </div>
  );
}
