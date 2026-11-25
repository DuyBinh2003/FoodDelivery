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

  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const vnpTxnRef = searchParams.get('vnp_TxnRef');
  const vnpAmount = searchParams.get('vnp_Amount');
  const vnpBankCode = searchParams.get('vnp_BankCode');
  const vnpOrderInfo = searchParams.get('vnp_OrderInfo');
  const vnpTransactionNo = searchParams.get('vnp_TransactionNo');

  const momoResultCode = searchParams.get('resultCode');
  const momoOrderId = searchParams.get('orderId');
  const momoAmount = searchParams.get('amount');
  const momoOrderInfo = searchParams.get('orderInfo');
  const momoTransId = searchParams.get('transId');

  const isVnPay = Boolean(vnpResponseCode !== null);
  const isMoMo = Boolean(momoResultCode !== null);

  const isSuccess = isVnPay
    ? vnpResponseCode === '00'
    : isMoMo
    ? momoResultCode === '0'
    : false;

  const transactionCode = vnpTxnRef || momoOrderId || 'Chưa xác định';
  const gatewayTransactionNo = vnpTransactionNo || momoTransId || 'N/A';
  const bankOrProvider = isVnPay
    ? `VNPAY (${vnpBankCode || 'Ngân hàng'})`
    : isMoMo
    ? 'MoMo E-Wallet'
    : 'Cổng Trực Tuyến';

  const rawAmount = vnpAmount ? Number(vnpAmount) / 100 : momoAmount ? Number(momoAmount) : 0;
  const description = vnpOrderInfo || momoOrderInfo || 'Giao dịch thanh toán';

  const isWalletTopup =
    description.toLowerCase().includes('wallet') || description.toLowerCase().includes('nap tien');

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="text-center relative z-10 mb-8">
          <div
            className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4 border ${
              isSuccess
                ? 'bg-primary/12 border-primary/25 text-primary'
                : 'bg-destructive/12 border-destructive/25 text-destructive'
            }`}
          >
            {isSuccess ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-2 ${
              isSuccess
                ? 'bg-primary/12 text-primary border border-primary/25'
                : 'bg-destructive/12 text-destructive border border-destructive/25'
            }`}
          >
            {isSuccess ? 'Giao dịch thành công' : 'Giao dịch thất bại / Đã hủy'}
          </span>

          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            {isSuccess ? 'Thanh Toán Hoàn Tất' : 'Thanh Toán Không Thành Công'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuccess
              ? 'Hệ thống đã ghi nhận thanh toán và cập nhật số dư / đơn hàng của bạn.'
              : 'Giao dịch bị từ chối hoặc bị hủy bởi người dùng trong quá trình thanh toán.'}
          </p>
        </div>

        <div className="bg-secondary/50 border border-border rounded-2xl p-5 space-y-3 mb-6 relative z-10">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Số tiền thanh toán
            </span>
            <span className="text-lg font-extrabold text-primary font-mono">
              {rawAmount > 0 ? `${rawAmount.toLocaleString('vi-VN')} ₫` : 'Theo thông tin đơn hàng'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cổng thanh toán:</span>
            <span className="font-semibold text-foreground">{bankOrProvider}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Mã đơn hàng / Giao dịch:</span>
            <span className="font-mono text-foreground font-medium truncate max-w-[200px]" title={transactionCode}>
              {transactionCode}
            </span>
          </div>

          {gatewayTransactionNo !== 'N/A' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Mã tham chiếu cổng:</span>
              <span className="font-mono text-muted-foreground">{gatewayTransactionNo}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Nội dung:</span>
            <span className="text-foreground truncate max-w-[220px]" title={description}>
              {description}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
            <span className="text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Xác thực Idempotent
            </span>
            <span className="text-primary font-semibold">Bảo mật sổ cái kép</span>
          </div>
        </div>

        {isSuccess && (
          <div className="mb-6 p-3 rounded-xl bg-secondary border border-border flex items-center justify-between text-xs text-foreground">
            <span className="flex items-center gap-2">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin text-primary" />
              Tự động chuyển tiếp sau {countdown} giây...
            </span>
            <span className="text-muted-foreground">
              {isWalletTopup ? 'Về ví cá nhân' : 'Về lịch sử đơn'}
            </span>
          </div>
        )}

        <div className="space-y-2.5 relative z-10">
          {isSuccess ? (
            <>
              <Link
                href={isWalletTopup ? '/profile' : '/history'}
                className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isWalletTopup ? (
                  <>
                    <Wallet className="w-4 h-4" /> Về ví cá nhân
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Theo dõi đơn hàng
                  </>
                )}
              </Link>
              <Link
                href="/"
                className="w-full py-3 px-4 bg-secondary hover:bg-muted text-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Về trang chủ <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/checkout"
                className="w-full py-3.5 px-4 bg-destructive hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCcw className="w-4 h-4" /> Thử thanh toán lại
              </Link>
              <Link
                href="/"
                className="w-full py-3 px-4 bg-secondary hover:bg-muted text-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
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
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang đồng bộ kết quả thanh toán...</p>
          </div>
        </div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
