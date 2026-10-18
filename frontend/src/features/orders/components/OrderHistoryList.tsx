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
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    ACCEPTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COOKING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    READY_FOR_PICKUP: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    DELIVERING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <Badge className={`${statusColors[status]} hover:${statusColors[status]} shadow-sm backdrop-blur-md`}>{status}</Badge>;
};

const SkeletonCard = () => (
  <Card className="overflow-hidden border-white/10 bg-zinc-900/50 shadow-sm animate-pulse">
    <CardHeader className="bg-white/5 pb-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-white/10 rounded"></div>
          <div className="h-4 w-32 bg-white/5 rounded"></div>
        </div>
        <div className="h-6 w-24 bg-white/10 rounded-full"></div>
      </div>
    </CardHeader>
    <CardContent className="pt-6 space-y-4">
      <div className="flex justify-between"><div className="h-4 w-3/4 bg-white/5 rounded"></div><div className="h-4 w-12 bg-white/5 rounded"></div></div>
      <div className="flex justify-between"><div className="h-4 w-1/2 bg-white/5 rounded"></div><div className="h-4 w-12 bg-white/5 rounded"></div></div>
      <div className="border-t border-white/10 pt-4 mt-4 flex justify-between"><div className="h-5 w-16 bg-white/10 rounded"></div><div className="h-5 w-24 bg-white/10 rounded"></div></div>
    </CardContent>
    <CardFooter className="bg-zinc-900/50 border-t border-white/10 pt-4 justify-end">
      <div className="h-10 w-28 bg-white/10 rounded-md"></div>
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
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/50 rounded-xl border border-white/10 shadow-sm text-center">
        <PackageOpen className="w-16 h-16 text-zinc-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Oops! Something went wrong</h3>
        <p className="text-zinc-400 mb-6 max-w-md">We couldn&apos;t load your order history. Please try again later.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="border-white/10 text-white hover:bg-white/10">Try Again</Button>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-zinc-900/50 rounded-xl border border-dashed border-white/20 shadow-sm text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/5 p-4 rounded-full mb-6">
          <Utensils className="w-12 h-12 text-zinc-500" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2">No orders yet</h3>
        <p className="text-zinc-400 mb-8 max-w-md">Looks like you haven&apos;t placed any orders. Discover great restaurants around you!</p>
        <Button size="lg" onClick={() => router.push('/')} className="shadow-md bg-white text-zinc-950 hover:bg-zinc-200">
          Browse Restaurants
        </Button>
      </div>
    );
  }

  const handleReorder = async (order: Order) => {
    const currentRestaurantId = useCartStore.getState().restaurantId;
    const currentItems = useCartStore.getState().items;

    if (currentRestaurantId && currentRestaurantId !== order.restaurant_id && currentItems.length > 0) {
      const confirmClear = window.confirm("Giỏ hàng của bạn đang chứa món từ nhà hàng khác. Bạn có muốn xoá giỏ hàng hiện tại để đặt lại đơn này không?");
      if (!confirmClear) {
        return;
      }
    }

    // Tái tạo lại giỏ hàng từ order.items
    const cartItems = order.items.map((item: OrderItem) => ({
      id: item.menu_item_id || item.id, // ID unique trong giỏ
      item_id: item.menu_item_id, // ID thật của món
      name: item.name || 'Món ăn',
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
          className="overflow-hidden border border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-zinc-900/50 backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between bg-white/5 pb-4 border-b border-white/5">
            <div>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-zinc-500" />
                {order.restaurant_name || 'Nhà hàng'}
              </CardTitle>
              <div className="text-sm text-zinc-400 mt-2 flex items-center gap-1.5">
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
                    <span className="font-medium text-zinc-300 flex items-center gap-2">
                      <span className="bg-white/10 text-zinc-400 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                      {item.name || 'Món ăn'}
                    </span>
                    <span className="text-zinc-400">{formatCurrency(Number(item.unit_price))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 mt-2 pt-4 flex justify-between font-bold text-lg items-center">
                <span className="flex items-center gap-2 text-white"><Receipt className="w-5 h-5 text-zinc-500" /> Tổng tiền</span>
                <span className="text-orange-500 text-xl">{formatCurrency(Number(order.total_amount))}</span>
              </div>
            </div>
            
            {order.review && (
              <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-white/5 text-sm text-zinc-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                <div className="flex items-start justify-between">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-500" />
                    <span className="text-white">Your Review</span>
                  </p>
                  <span className="text-yellow-500 tracking-widest text-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">{'★'.repeat(order.review.restaurant_rating || 0)}</span>
                </div>
                <p className="italic text-zinc-400 leading-relaxed">&quot;{order.review.comment}&quot;</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/5 flex justify-end gap-3 pt-4 pb-4">
            {order.status === 'COMPLETED' && !order.review && (
              <Button variant="outline" className="shadow-sm border-white/10 text-white hover:bg-white/10 transition-colors" onClick={() => setReviewOrderId(order.id)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Leave a Review
              </Button>
            )}
            <Button onClick={() => handleReorder(order)} className="shadow-sm transition-transform active:scale-95 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0">
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
