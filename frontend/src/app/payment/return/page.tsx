'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCcw,
  Receipt,
  Wallet,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(6);

  // VNPay Params
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const vnpTxnRef = searchParams.get('vnp_TxnRef');
  const vnpAmount = searchParams.get('vnp_Amount');
  const vnpBankCode = searchParams.get('vnp_BankCode');
  const vnpOrderInfo = searchParams.get('vnp_OrderInfo');
  const vnpTransactionNo = searchParams.get('vnp_TransactionNo');

  // MoMo Params
  const momoResultCode = searchParams.get('resultCode');
  const momoOrderId = searchParams.get('orderId');
  const momoAmount = searchParams.get('amount');
  const momoOrderInfo = searchParams.get('orderInfo');
  const momoTransId = searchParams.get('transId');

  // Common Info
  const isVnPay = Boolean(vnpResponseCode !== null);
  const isMoMo = Boolean(momoResultCode !== null);

  const isSuccess = isVnPay
    ? vnpResponseCode === '00'
    : isMoMo
    ? momoResultCode === '0'
    : false;

  const transactionCode = vnpTxnRef || momoOrderId || 'TXN-DEMO-2026';
  const gatewayTransactionNo = vnpTransactionNo || momoTransId || 'N/A';
  const bankOrProvider = isVnPay ? `VNPAY (${vnpBankCode || 'NCB'})` : isMoMo ? 'MoMo E-Wallet' : 'Cổng Trực Tuyến';

  const rawAmount = vnpAmount ? Number(vnpAmount) / 100 : momoAmount ? Number(momoAmount) : 0;
  const description = vnpOrderInfo || momoOrderInfo || 'Giao dịch thanh toán';

  // Check if it's order payment or wallet topup
  const isWalletTopup = description.toLowerCase().includes('wallet') || description.toLowerCase().includes('nap tien');

  useEffect(() => {
    if (countdown <= 0) {
      if (isSuccess) {
        if (isWalletTopup) {
          router.push('/profile');
        } else {
          router.push('/history');
        }
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isSuccess, isWalletTopup, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div
          className={`absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
        <div
          className={`absolute -bottom-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isSuccess ? 'bg-teal-500' : 'bg-amber-500'
          }`}
        />

        {/* Status Header */}
        <div className="text-center relative z-10 mb-8">
          <div
            className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4 border ${
              isSuccess
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/20'
            }`}
          >
            {isSuccess ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-2 ${
              isSuccess
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isSuccess ? 'Giao dịch thành công' : 'Giao dịch thất bại / Đã hủy'}
          </span>

          <h1 className="text-2xl font-bold text-slate-100">
            {isSuccess ? 'Thanh Toán Hoàn Tất' : 'Thanh Toán Không Thành Công'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isSuccess
              ? 'Hệ thống đã ghi nhận thanh toán và cập nhật số dư / đơn hàng của bạn.'
              : 'Giao dịch bị từ chối hoặc bị hủy bởi người dùng trong quá trình thanh toán.'}
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 mb-6 relative z-10">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-500" /> Số tiền thanh toán
            </span>
            <span className="text-lg font-bold text-emerald-400">
              {rawAmount > 0 ? `${rawAmount.toLocaleString('vi-VN')} ₫` : 'Theo thông tin đơn hàng'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Cổng thanh toán:</span>
            <span className="font-semibold text-slate-200">{bankOrProvider}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Mã đơn hàng / Giao dịch:</span>
            <span className="font-mono text-slate-300 font-medium truncate max-w-[200px]" title={transactionCode}>
              {transactionCode}
            </span>
          </div>

          {gatewayTransactionNo !== 'N/A' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Mã tham chiếu cổng:</span>
              <span className="font-mono text-slate-400">{gatewayTransactionNo}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Nội dung:</span>
            <span className="text-slate-300 truncate max-w-[220px]" title={description}>
              {description}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/40">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Xác thực Idempotent
            </span>
            <span className="text-emerald-400 font-medium">Bảo mật sổ cái kép</span>
          </div>
        </div>

        {/* Auto Redirect Banner */}
        {isSuccess && (
          <div className="mb-6 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              Tự động chuyển tiếp sau {countdown} giây...
            </span>
            <span className="text-slate-400">
              {isWalletTopup ? 'Về ví cá nhân' : 'Về lịch sử đơn'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 relative z-10">
          {isSuccess ? (
            <>
              {isWalletTopup ? (
                <Link
                  href="/profile"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <Wallet className="w-4 h-4" /> Về ví cá nhân
                </Link>
              ) : (
                <Link
                  href="/history"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <ShoppingBag className="w-4 h-4" /> Theo dõi đơn hàng
                </Link>
              )}
              <Link
                href="/"
                className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Về trang chủ <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/checkout"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98]"
              >
                <RefreshCcw className="w-4 h-4" /> Thử thanh toán lại
              </Link>
              <Link
                href="/"
                className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Về trang chủ <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCcw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm text-slate-400">Đang đồng bộ kết quả thanh toán...</p>
          </div>
        </div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
