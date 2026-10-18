'use client';

import React, { useState } from 'react';
import {
  Receipt,
  Banknote,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { OrderBillCardProps } from '../types';

export function OrderBillCard({ order, paymentDetails }: OrderBillCardProps) {
  const [copied, setCopied] = useState(false);

  const paymentMethod =
    order.payment_method ||
    paymentDetails?.paymentIntent?.payment_method ||
    'CASH';

  const isWalletPaid = paymentMethod === 'WALLET';
  const isCOD = paymentMethod === 'CASH' || paymentMethod === 'COD';

  const transactionCode =
    paymentDetails?.paymentIntent?.gateway_transaction_id ||
    paymentDetails?.transaction?.transaction_code ||
    `TXN-${order.id.slice(0, 8).toUpperCase()}`;

  const handleCopyTxn = () => {
    navigator.clipboard.writeText(transactionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const itemsTotal = (order.items || []).reduce(
    (acc, it) => acc + (Number(it.unit_price) || 0) * (it.quantity || 1),
    0
  );

  const totalNum = Number(order.total_amount) || itemsTotal;
  const deliveryFee = totalNum > itemsTotal ? totalNum - itemsTotal : 0;

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-white/[0.08] p-5 shadow-lg shadow-black/20 backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-orange-400" />
          Chi tiết đơn hàng & Thanh toán
        </h3>
        <span className="text-xs text-zinc-400 font-mono">
          {order.items?.length || 0} món
        </span>
      </div>

      {/* Item List */}
      <div className="divide-y divide-white/[0.04]">
        {(order.items || []).map((item, idx) => {
          const itemTotal = (Number(item.unit_price) || 0) * (item.quantity || 1);
          return (
            <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[11px] text-orange-400 shrink-0">
                  {item.quantity}x
                </span>
                <span className="text-zinc-200 font-medium truncate">
                  {item.name || 'Món ăn'}
                </span>
              </div>
              <span className="font-semibold text-zinc-300 font-mono shrink-0">
                {formatCurrency(itemTotal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cost Breakdown */}
      <div className="pt-3 border-t border-white/[0.06] space-y-1.5 text-xs text-zinc-400">
        <div className="flex justify-between">
          <span>Tiền món:</span>
          <span className="text-zinc-300 font-mono">{formatCurrency(itemsTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Phí giao hàng:</span>
          <span className="text-zinc-300 font-mono">
            {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Miễn phí'}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.06]">
          <span>Tổng thanh toán:</span>
          <span className="text-orange-400 font-mono text-base">
            {formatCurrency(totalNum)}
          </span>
        </div>
      </div>

      {/* Payment Method Badge & Details */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {isWalletPaid ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ĐÃ THANH TOÁN QUA VÍ FOODPAY
            </Badge>
          ) : isCOD ? (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
              <Banknote className="w-3.5 h-3.5" />
              TIỀN MẶT KHI NHẬN HÀNG (COD)
            </Badge>
          ) : (
            <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              THANH TOÁN: {paymentMethod}
            </Badge>
          )}

          {isWalletPaid && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="text-[10px] text-zinc-500">Mã GD:</span>
              <span className="font-mono text-zinc-300">{transactionCode}</span>
              <button
                type="button"
                onClick={handleCopyTxn}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5"
                title="Sao chép mã giao dịch"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
