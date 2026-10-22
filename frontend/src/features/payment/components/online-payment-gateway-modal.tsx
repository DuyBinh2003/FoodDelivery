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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900/95 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden text-white space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Glow effect */}
        <div
          className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none ${
            isVnPay ? 'bg-blue-600/15' : 'bg-pink-600/15'
          }`}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
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
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>{isVnPay ? 'Cổng Thanh Toán VNPAY QR' : 'Thanh Toán Ví MoMo'}</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Sandbox Live
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {isVnPay
                  ? 'Quét qua 40+ ứng dụng ngân hàng hoặc Ví VNPAY'
                  : 'Quét bằng ứng dụng Ví MoMo trên điện thoại'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-white">Thanh toán thành công!</h4>
              <p className="text-sm text-zinc-400">
                Hệ thống đã nhận được tiền và hạch toán vào Sổ cái kép.
              </p>
              <p className="text-xs text-emerald-400 font-semibold mt-2">
                Đang chuyển hướng sang trang chi tiết đơn hàng...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Amount Banner & Countdown */}
            <div className="flex items-center justify-between bg-zinc-800/60 border border-white/5 rounded-2xl p-4">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Số tiền thanh toán:</span>
                <span className="text-2xl font-black text-orange-400 font-mono tracking-tight">
                  {formatVND(paymentData.amount)}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Mã hết hạn trong:
                </span>
                <span
                  className={`text-lg font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                    timeLeft < 60
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                      : 'bg-zinc-900 text-zinc-200 border-white/10'
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* QR Code Presentation Box */}
            <div className="flex flex-col items-center justify-center bg-zinc-950/70 border border-white/10 rounded-2xl p-5 space-y-3 shadow-inner">
              <div className="relative p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt={`Mã QR ${paymentData.gateway}`}
                  width={220}
                  height={220}
                  className="rounded-xl object-contain"
                />
              </div>

              <p className="text-xs text-zinc-400 text-center flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>Mở ứng dụng Ngân hàng / {isVnPay ? 'VNPAY' : 'MoMo'} và quét mã để thanh toán</span>
              </p>

              {/* Transaction Ref Pill */}
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-300">
                <span>Mã giao dịch: <strong>{paymentData.transactionRef}</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentData.transactionRef)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Sao chép mã giao dịch"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
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
                className="w-full py-3 px-4 rounded-2xl font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Đang kích hoạt Webhook Sổ cái kép...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mô Phỏng Thanh Toán Thành Công (Test Sandbox)</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Giao dịch bảo mật bằng chữ ký số HMAC-SHA512 & Webhook Idempotency</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
