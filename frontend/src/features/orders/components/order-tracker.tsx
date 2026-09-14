'use client';

import { useState, useEffect } from 'react';
import { MapPin, Store, Receipt, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import OrderStepper from '@/features/orders/components/order-stepper';
import type { Order, OrderStatus } from '@/features/orders/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUS_FLOW: OrderStatus[] = ['PENDING', 'ACCEPTED', 'COOKING', 'DELIVERING', 'COMPLETED'];

interface OrderTrackerProps {
  order: Order;
}

export default function OrderTracker({ order }: OrderTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const startIndex = STATUS_FLOW.indexOf(currentStatus);
    if (startIndex < 0 || startIndex >= STATUS_FLOW.length - 1) return;

    setIsSimulating(true);
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
    }, 4000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white/[0.02] border-white/[0.08] rounded-2xl">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 shrink-0">
              <Store className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Nhà hàng</p>
              <p className="text-sm font-medium text-white">{order.restaurant_name}</p>
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
            {order.items.map((item) => (
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
