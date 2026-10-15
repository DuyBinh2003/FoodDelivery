'use client';

import { useState, useEffect } from 'react';
import { MapPin, Store, Receipt, Clock, Wallet, Banknote, CheckCircle2, Copy, Check, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import OrderStepper from '@/features/orders/components/order-stepper';
import type { Order, OrderStatus } from '@/features/orders/types';
import type { OrderPaymentDetails } from '@/features/payment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUS_FLOW: OrderStatus[] = ['PENDING', 'ACCEPTED', 'COOKING', 'DELIVERING', 'COMPLETED'];

interface OrderTrackerProps {
  order: Order;
  paymentDetails?: OrderPaymentDetails | null;
}

export default function OrderTracker({ order, paymentDetails }: OrderTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [isCopied, setIsCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(() => {
    const startIndex = STATUS_FLOW.indexOf(order.status);
    return startIndex >= 0 && startIndex < STATUS_FLOW.length - 1;
  });

  useEffect(() => {
    const startIndex = STATUS_FLOW.indexOf(currentStatus);
    if (startIndex < 0 || startIndex >= STATUS_FLOW.length - 1) return;

    const interval = setInterval(() => {
      setCurrentStatus((prev) => {
        const idx = STATUS_FLOW.indexOf(prev);
        if (idx >= STATUS_FLOW.length - 1) {
          clearInterval(interval);
          setIsSimulating(false);
          return prev;
        }
        return STATUS_FLOW[idx + 1];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStatus]);

  const paymentMethod = paymentDetails?.paymentIntent?.payment_method || 'COD';
  const isWalletPaid = paymentMethod === 'WALLET';
  const transactionCode = paymentDetails?.paymentIntent?.gateway_transaction_id || paymentDetails?.transaction?.transaction_code;

  const handleCopyTxn = () => {
    if (!transactionCode) return;
    navigator.clipboard.writeText(transactionCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Theo dõi đơn hàng</h1>
        <div className="flex items-center justify-center gap-3">
          <Badge variant="outline" className="font-mono text-zinc-400 border-white/10 bg-white/5">
            #{order.id.slice(0, 8)}
          </Badge>
          {isSimulating && (
            <Badge className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20 gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              Live Update
            </Badge>
          )}
        </div>
      </div>

      {/* Stepper Card */}
      <Card className="bg-white/[0.02] border-white/[0.08] rounded-3xl overflow-hidden">
        <CardContent className="pt-6">
          <OrderStepper currentStatus={currentStatus} />
        </CardContent>
      </Card>

      {/* Payment Status Card */}
      <Card className="bg-white/[0.02] border-white/[0.08] rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/[0.01] border-b border-white/[0.06] pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              Thông tin thanh toán
            </CardTitle>

            {isWalletPaid ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ĐÃ THANH TOÁN QUA VÍ FOODPAY
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/30 gap-1.5 px-3 py-1 font-semibold">
                <Banknote className="w-3.5 h-3.5" />
                TIỀN MẶT KHI NHẬN HÀNG (COD)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-2">
              {isWalletPaid ? <Wallet className="w-4 h-4 text-orange-400" /> : <Banknote className="w-4 h-4 text-amber-400" />}
              Phương thức:
            </span>
            <span className="text-white font-medium">
              {isWalletPaid ? 'Ví điện tử FoodPay (Khấu trừ sổ cái)' : 'Tiền mặt giao tận nơi'}
            </span>
          </div>

          {transactionCode && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
              <span className="text-zinc-400">Mã đối soát sổ cái:</span>
              <div className="flex items-center gap-2">
                <code className="bg-black/50 text-orange-400 px-2 py-0.5 rounded-lg border border-white/10 font-mono text-xs">
                  {transactionCode}
                </code>
                <button
                  onClick={handleCopyTxn}
                  title="Copy mã giao dịch"
                  className="p-1 text-zinc-400 hover:text-white rounded transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
            <span className="text-zinc-400">Trạng thái dòng tiền:</span>
            <span className={`font-semibold ${isWalletPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isWalletPaid ? 'Đã quyết toán vào sổ cái kế toán kép' : 'Chờ tài xế thu tiền khi giao hàng'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white/[0.02] border-white/[0.08] rounded-2xl">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 shrink-0">
              <Store className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Nhà hàng</p>
              <p className="text-sm font-medium text-white">{order.restaurant_name || 'Nhà hàng ẩm thực Việt'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.08] rounded-2xl">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 shrink-0">
              <MapPin className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Giao đến</p>
              <p className="text-sm font-medium text-white">{order.delivery_address}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Card */}
      <Card className="bg-white/[0.02] border-white/[0.08] rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/[0.01] border-b border-white/[0.06] pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-zinc-400" />
            Chi tiết hóa đơn
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/[0.04]">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-5 hover:bg-white/[0.01] transition-colors">
                <div className="flex gap-4 items-center">
                  <Badge variant="secondary" className="bg-white/5 text-zinc-300">
                    x{item.quantity}
                  </Badge>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-300">
                  {formatCurrency(item.quantity * item.unit_price)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-6 bg-orange-500/5">
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Tổng thanh toán</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
