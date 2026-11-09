'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw, Wallet, ArrowRight, X } from 'lucide-react';

interface SagaRollbackModalProps {
  isOpen: boolean;
  orderId?: string;
  refundAmount?: number;
  pointsRefunded?: number;
  reason?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function SagaRollbackModal({
  isOpen,
  orderId,
  refundAmount = 0,
  pointsRefunded = 0,
  reason = 'Không tìm thấy tài xế phù hợp nhận cuốc xe trong khu vực của bạn.',
  onClose,
  onRetry,
}: SagaRollbackModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNavigateWallet = () => {
    onClose();
    router.push('/profile/wallet');
  };

  const handleRetryOrder = () => {
    onClose();
    if (onRetry) {
      onRetry();
    } else {
      router.push('/cart');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-500/5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Không thể hoàn tất đơn hàng</h2>
          <p className="text-sm text-muted-foreground mt-2 px-2">{reason}</p>
        </div>

        {/* Financial Refund Card */}
        <div className="mt-6 p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bảo đảm hoàn tiền tự động (Compensating Saga)
          </div>

          {refundAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Số tiền đã hoàn về ví:
              </span>
              <span className="font-bold text-foreground text-base">
                {refundAmount.toLocaleString('vi-VN')} VND
              </span>
            </div>
          )}

          {pointsRefunded > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Điểm thưởng đã khôi phục:
              </span>
              <span className="font-bold text-foreground text-base">
                +{pointsRefunded.toLocaleString('vi-VN')} điểm
              </span>
            </div>
          )}

          {orderId && (
            <div className="text-xs text-muted-foreground pt-1 border-t border-border/60">
              Mã đơn tham chiếu: <span className="font-mono text-foreground">{orderId}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleRetryOrder}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Thử đặt lại đơn hàng
          </button>

          <button
            onClick={handleNavigateWallet}
            className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Kiểm tra số dư ví
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default SagaRollbackModal;

