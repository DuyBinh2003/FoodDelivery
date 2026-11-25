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
    0,
  );

  const orderWithFees = order as typeof order & { subtotal?: number; delivery_fee?: number };
  const subtotal = Number(orderWithFees.subtotal) || itemsTotal;
  const deliveryFee =
    Number(orderWithFees.delivery_fee) ||
    (Number(order.total_amount) > subtotal ? Number(order.total_amount) - subtotal : 15000);
  const totalNum = Number(order.total_amount) || subtotal + deliveryFee;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" />
          Chi tiết đơn hàng & Thanh toán
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {order.items?.length || 0} món
        </span>
      </div>

      <div className="divide-y divide-border/70">
        {(order.items || []).map((item, idx) => {
          const itemTotal = (Number(item.unit_price) || 0) * (item.quantity || 1);
          return (
            <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="w-6 h-6 rounded-md bg-primary/12 border border-primary/20 flex items-center justify-center font-bold text-[11px] text-primary shrink-0">
                  {item.quantity}x
                </span>
                <span className="text-foreground font-medium truncate">
                  {item.name || 'Món ăn'}
                </span>
              </div>
              <span className="font-semibold text-foreground font-mono shrink-0">
                {formatCurrency(itemTotal)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Tiền món ăn:</span>
          <span className="text-foreground font-mono font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Phí giao hàng:</span>
          <span className="text-foreground font-mono font-medium">
            {formatCurrency(deliveryFee)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
          <span>Tổng thanh toán:</span>
          <span className="text-primary font-mono text-base font-extrabold">
            {formatCurrency(totalNum)}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {isWalletPaid ? (
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ĐÃ THANH TOÁN QUA VÍ FOODPAY
            </Badge>
          ) : isCOD ? (
            <Badge variant="warning" className="gap-1.5 px-3 py-1">
              <Banknote className="w-3.5 h-3.5" />
              TIỀN MẶT KHI NHẬN HÀNG (COD)
            </Badge>
          ) : (
            <Badge variant="info" className="gap-1.5 px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              THANH TOÁN: {paymentMethod}
            </Badge>
          )}

          {isWalletPaid && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[10px]">Mã GD:</span>
              <span className="font-mono text-foreground">{transactionCode}</span>
              <button
                type="button"
                onClick={handleCopyTxn}
                className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-secondary cursor-pointer"
                title="Sao chép mã giao dịch"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
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
