'use client';

import React, { useState } from 'react';
import { useOrderHistory } from '@/features/orders/hooks/useOrderHistory';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderReviewModal } from '@/features/orders/components/OrderReviewModal';
import { Order, OrderItem, OrderStatus } from '@/features/orders/types';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';
import { PackageOpen, Clock, Receipt, RotateCcw, MessageSquare, Utensils } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusColors: Record<OrderStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
    COOKING: 'bg-purple-100 text-purple-800 border-purple-200',
    DELIVERING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  };
  return <Badge className={`${statusColors[status]} hover:${statusColors[status]} shadow-sm`}>{status}</Badge>;
};

const SkeletonCard = () => (
  <Card className="overflow-hidden border border-slate-200 shadow-sm animate-pulse">
    <CardHeader className="bg-slate-50/50 pb-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 rounded"></div>
          <div className="h-4 w-32 bg-slate-100 rounded"></div>
        </div>
        <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
      </div>
    </CardHeader>
    <CardContent className="pt-6 space-y-4">
      <div className="flex justify-between"><div className="h-4 w-3/4 bg-slate-100 rounded"></div><div className="h-4 w-12 bg-slate-100 rounded"></div></div>
      <div className="flex justify-between"><div className="h-4 w-1/2 bg-slate-100 rounded"></div><div className="h-4 w-12 bg-slate-100 rounded"></div></div>
      <div className="border-t pt-4 mt-4 flex justify-between"><div className="h-5 w-16 bg-slate-200 rounded"></div><div className="h-5 w-24 bg-slate-200 rounded"></div></div>
    </CardContent>
    <CardFooter className="bg-white border-t pt-4 justify-end">
      <div className="h-10 w-28 bg-slate-200 rounded-md"></div>
    </CardFooter>
  </Card>
);

export const OrderHistoryList = () => {
  const { data: orders, isLoading, error } = useOrderHistory();
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const router = useRouter();
  
  const setCartItems = useCartStore((state) => state.setItems);
  const { validateCart } = useCartValidation();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border shadow-sm text-center">
        <PackageOpen className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Oops! Something went wrong</h3>
        <p className="text-slate-500 mb-6 max-w-md">We couldn&apos;t load your order history. Please try again later.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-dashed border-slate-300 shadow-sm text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-50 p-4 rounded-full mb-6">
          <Utensils className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-2xl font-semibold text-slate-900 mb-2">No orders yet</h3>
        <p className="text-slate-500 mb-8 max-w-md">Looks like you haven&apos;t placed any orders. Discover great restaurants around you!</p>
        <Button size="lg" onClick={() => router.push('/')} className="shadow-md">
          Browse Restaurants
        </Button>
      </div>
    );
  }

  const handleReorder = async (order: Order) => {
    // Tái tạo lại giỏ hàng từ order.items
    const cartItems = order.items.map((item: OrderItem) => ({
      id: item.menu_item_id || item.id, // ID unique trong giỏ
      item_id: item.menu_item_id, // ID thật của món
      name: item.name || 'Menu Item',
      price: Number(item.unit_price),
      quantity: item.quantity,
    }));

    // Cập nhật local state giỏ hàng
    setCartItems(cartItems, order.restaurant_id);

    // Gọi API validate
    const res = await validateCart();
    if (res.isValid) {
      router.push('/checkout');
    } else {
      alert(res.message || 'Có lỗi xảy ra khi xác thực giỏ hàng.');
      router.push('/checkout'); // Chuyển đến checkout để user xem lỗi
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {orders.map((order, index) => (
        <Card 
          key={order.id} 
          className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-slate-400" />
                {order.restaurant_name || 'Restaurant'}
              </CardTitle>
              <div className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {new Date(order.created_at).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                      {item.name || 'Item'}
                    </span>
                    <span className="text-slate-600">{formatCurrency(Number(item.unit_price))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-2 pt-4 flex justify-between font-bold text-lg items-center">
                <span className="flex items-center gap-2 text-slate-800"><Receipt className="w-5 h-5 text-slate-400" /> Total</span>
                <span className="text-primary text-xl">{formatCurrency(Number(order.total_amount))}</span>
              </div>
            </div>
            
            {order.review && (
              <div className="mt-6 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm text-slate-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                <div className="flex items-start justify-between">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>Your Review</span>
                  </p>
                  <span className="text-yellow-500 tracking-widest text-lg drop-shadow-sm">{'★'.repeat(order.review.restaurant_rating || 0)}</span>
                </div>
                <p className="italic text-slate-600 leading-relaxed">&quot;{order.review.comment}&quot;</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/30 border-t border-slate-100 flex justify-end gap-3 pt-4 pb-4">
            {order.status === 'COMPLETED' && !order.review && (
              <Button variant="outline" className="shadow-sm hover:bg-slate-100 transition-colors" onClick={() => setReviewOrderId(order.id)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Leave a Review
              </Button>
            )}
            <Button onClick={() => handleReorder(order)} className="shadow-sm transition-transform active:scale-95">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reorder
            </Button>
          </CardFooter>
        </Card>
      ))}

      <OrderReviewModal 
        isOpen={!!reviewOrderId} 
        orderId={reviewOrderId!} 
        onClose={() => setReviewOrderId(null)} 
      />
    </div>
  );
};
