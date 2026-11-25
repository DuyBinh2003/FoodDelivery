'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import type { PaymentUrlResponse } from '../types';
import { simulateGatewayWebhook } from '../api/payment-api';

interface OnlinePaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentUrlResponse | null;
  orderId?: string;
  walletAccountId?: string;
  onPaymentSuccess: () => Promise<void> | void;
}

export function OnlinePaymentGatewayModal({
  isOpen,
  onClose,
  paymentData,
  orderId,
  walletAccountId,
  onPaymentSuccess,
}: OnlinePaymentGatewayModalProps) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút đếm ngược
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCloseModal = () => {
    setTimeLeft(900);
    setIsSuccess(false);
    setErrorMsg(null);
    onClose();
  };

  // Đếm ngược 15 phút
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !paymentData) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const isVnPay = paymentData.gateway === 'VNPAY';

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Kích hoạt mô phỏng thanh toán thành công (Sandbox test)
  const handleSimulateSuccess = async () => {
    try {
      setIsSimulating(true);
      setErrorMsg(null);

      await simulateGatewayWebhook({
        gateway: paymentData.gateway,
        transactionRef: paymentData.transactionRef,
        amount: paymentData.amount,
        walletAccountId,
        orderId,
        isSuccess: true,
      });

      setIsSuccess(true);
      await onPaymentSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi mô phỏng thanh toán';
      setErrorMsg(msg);
    } finally {
      setIsSimulating(false);
    }
  };

  // QR Code Image URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    paymentData.paymentUrl,
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Glow effect */}
        <div
          className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none ${
            isVnPay ? 'bg-blue-600/15' : 'bg-pink-600/15'
          }`}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm tracking-tighter shadow-md ${
                isVnPay
                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/20'
                  : 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-pink-500/20'
              }`}
            >
              {isVnPay ? 'VNPAY' : 'MOMO'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>{isVnPay ? 'Cổng Thanh Toán VNPAY QR' : 'Thanh Toán Ví MoMo'}</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Sandbox Live
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {isVnPay
                  ? 'Quét qua 40+ ứng dụng ngân hàng hoặc Ví VNPAY'
                  : 'Quét bằng ứng dụng Ví MoMo trên điện thoại'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center shadow-lg border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-foreground">Thanh toán thành công!</h4>
              <p className="text-sm text-muted-foreground">
                Hệ thống đã nhận được tiền và hạch toán vào Sổ cái kép.
              </p>
              <p className="text-xs text-primary font-semibold mt-2">
                Đang chuyển hướng sang trang chi tiết đơn hàng...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Amount Banner & Countdown */}
            <div className="flex items-center justify-between bg-muted/50 border border-border rounded-2xl p-4">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Số tiền thanh toán:</span>
                <span className="text-2xl font-black text-primary font-mono tracking-tight tabular-nums">
                  {formatVND(paymentData.amount)}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Mã hết hạn trong:
                </span>
                <span
                  className={`text-lg font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                    timeLeft < 60
                      ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                      : 'bg-background text-foreground border-border'
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* QR Code Presentation Box */}
            <div className="flex flex-col items-center justify-center bg-muted/30 border border-border rounded-2xl p-5 space-y-3 shadow-inner">
              <div className="relative p-3 bg-white rounded-2xl shadow-md border border-border/50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt={`Mã QR ${paymentData.gateway}`}
                  width={220}
                  height={220}
                  className="rounded-xl object-contain"
                />
              </div>

              <p className="text-xs text-muted-foreground text-center flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Mở ứng dụng Ngân hàng / {isVnPay ? 'VNPAY' : 'MoMo'} và quét mã để thanh toán</span>
              </p>

              {/* Transaction Ref Pill */}
              <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-xl text-xs font-mono text-foreground">
                <span>Mã giao dịch: <strong>{paymentData.transactionRef}</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentData.transactionRef)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Sao chép mã giao dịch"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Button 1: Open External Sandbox Page */}
              <a
                href={paymentData.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-sm shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
                  isVnPay
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                    : 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/20'
                }`}
              >
                <span>Mở Cổng Thanh Toán Sandbox</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Button 2: Simulate Success (Developer Sandbox Mode) */}
              <button
                type="button"
                onClick={handleSimulateSuccess}
                disabled={isSimulating}
                className="w-full py-3 px-4 rounded-2xl font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Đang kích hoạt Webhook Sổ cái kép...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>Mô Phỏng Thanh Toán Thành Công (Test Sandbox)</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Giao dịch bảo mật bằng chữ ký số HMAC-SHA512 & Webhook Idempotency</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
