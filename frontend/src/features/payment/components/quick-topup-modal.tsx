'use client';

import { useState } from 'react';
import { X, Wallet, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { createGatewayPaymentUrl } from '../api/payment-api';
import { OnlinePaymentGatewayModal } from './online-payment-gateway-modal';
import type { PaymentUrlResponse } from '../types';

interface QuickTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAccountId: string;
  currentBalance: number;
  orderTotal: number;
  onTopupSuccess: () => Promise<void>;
}

export default function QuickTopupModal({
  isOpen,
  onClose,
  walletAccountId,
  currentBalance,
  orderTotal,
  onTopupSuccess,
}: QuickTopupModalProps) {
  const missingAmount = Math.max(0, orderTotal - currentBalance);
  
  // Default selected amount to missing amount if > 0, otherwise 50,000
  const [selectedAmount, setSelectedAmount] = useState<number>(() => {
    return missingAmount > 0 ? missingAmount : 50000;
  });
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'MOMO'>('VNPAY');
  const [gatewayPaymentData, setGatewayPaymentData] = useState<PaymentUrlResponse | null>(null);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [
    ...(missingAmount > 0 ? [{ label: 'Vừa đủ đơn', amount: missingAmount, isFeatured: true }] : []),
    { label: '+50.000đ', amount: 50000 },
    { label: '+100.000đ', amount: 100000 },
    { label: '+200.000đ', amount: 200000 },
  ];

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const handleConfirmTopup = async () => {
    if (selectedAmount <= 0) {
      setErrorMsg('Vui lòng chọn số tiền hợp lệ');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/payment/return?walletAccountId=${walletAccountId}`
        : undefined;

      const gatewayRes = await createGatewayPaymentUrl({
        amount: selectedAmount,
        paymentMethod,
        walletAccountId,
        returnUrl,
      });

      setGatewayPaymentData(gatewayRes);
      setIsGatewayModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nạp tiền thất bại, vui lòng thử lại';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden text-white space-y-6">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Nạp nhanh Ví FoodPay</h3>
              <p className="text-xs text-zinc-400">Nạp tức thì để tiếp tục đặt hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isDone ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <p className="text-lg font-bold text-white">Nạp tiền thành công!</p>
            <p className="text-sm text-zinc-400">Đang cập nhật số dư ví của bạn...</p>
          </div>
        ) : (
          <>
            {/* Balance Overview */}
            <div className="bg-zinc-800/60 border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Số dư hiện tại:</span>
                <span className="font-semibold">{formatVND(currentBalance)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Tổng thanh toán đơn:</span>
                <span className="font-semibold text-orange-400">{formatVND(orderTotal)}</span>
              </div>
              {missingAmount > 0 && (
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-sm text-red-400 font-medium">
                  <span>Còn thiếu:</span>
                  <span>{formatVND(missingAmount)}</span>
                </div>
              )}
            </div>

            {/* Quick Amounts */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                Chọn số tiền nạp
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {quickAmounts.map((item, idx) => {
                  const isSelected = selectedAmount === item.amount;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAmount(item.amount)}
                      className={`relative p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/15 text-white font-semibold shadow-lg shadow-orange-500/10'
                          : 'border-white/10 bg-zinc-800/40 text-zinc-300 hover:border-white/20 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="text-xs text-zinc-400 flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.isFeatured && (
                          <span className="text-[10px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                            Gợi ý
                          </span>
                        )}
                      </div>
                      <div className="text-base font-bold mt-1 text-white">
                        {formatVND(item.amount)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Gateway Method */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                Cổng thanh toán
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VNPAY')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    paymentMethod === 'VNPAY'
                      ? 'border-orange-500 bg-orange-500/10 text-white font-medium'
                      : 'border-white/10 bg-zinc-800/30 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center">
                    VN
                  </div>
                  <span className="text-sm">VNPAY QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('MOMO')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    paymentMethod === 'MOMO'
                      ? 'border-orange-500 bg-orange-500/10 text-white font-medium'
                      : 'border-white/10 bg-zinc-800/30 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-pink-600/20 text-pink-400 font-bold text-xs flex items-center justify-center">
                    M
                  </div>
                  <span className="text-sm">Ví MoMo</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {errorMsg}
              </p>
            )}

            {/* Confirm Button */}
            <button
              onClick={handleConfirmTopup}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý nạp tiền...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận nạp {formatVND(selectedAmount)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Giao dịch an toàn & Mã hóa sổ cái kép FoodPay</span>
            </div>
          </>
        )}
      </div>

      {/* Online Gateway QR Payment Modal */}
      <OnlinePaymentGatewayModal
        isOpen={isGatewayModalOpen}
        onClose={() => setIsGatewayModalOpen(false)}
        paymentData={gatewayPaymentData}
        walletAccountId={walletAccountId}
        onPaymentSuccess={async () => {
          setIsDone(true);
          await onTopupSuccess();
          setTimeout(() => {
            setIsDone(false);
            setIsGatewayModalOpen(false);
            onClose();
          }, 1200);
        }}
      />
    </div>
  );
}
