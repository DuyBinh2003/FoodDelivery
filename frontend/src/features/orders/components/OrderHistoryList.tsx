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
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    ACCEPTED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    COOKING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    READY_FOR_PICKUP: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    DELIVERING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return <Badge variant="outline" className={`${statusColors[status]} text-xs font-medium`}>{status}</Badge>;
};

const SkeletonCard = () => (
  <Card className="overflow-hidden border border-border bg-card animate-pulse">
    <CardHeader className="bg-secondary/20 pb-4 border-b border-border">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-muted rounded"></div>
          <div className="h-4 w-32 bg-muted/60 rounded"></div>
        </div>
        <div className="h-6 w-24 bg-muted rounded-full"></div>
      </div>
    </CardHeader>
    <CardContent className="pt-6 space-y-4">
      <div className="flex justify-between"><div className="h-4 w-3/4 bg-muted rounded"></div><div className="h-4 w-12 bg-muted rounded"></div></div>
      <div className="flex justify-between"><div className="h-4 w-1/2 bg-muted rounded"></div><div className="h-4 w-12 bg-muted rounded"></div></div>
      <div className="border-t border-border pt-4 mt-4 flex justify-between"><div className="h-5 w-16 bg-muted rounded"></div><div className="h-5 w-24 bg-muted rounded"></div></div>
    </CardContent>
    <CardFooter className="bg-secondary/10 border-t border-border pt-4 justify-end">
      <div className="h-10 w-28 bg-muted rounded-md"></div>
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
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border text-center">
        <PackageOpen className="w-14 h-14 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">Đã có lỗi xảy ra</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">Không thể tải danh sách đơn hàng lúc này. Vui lòng thử lại sau.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">Thử lại</Button>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border text-center">
        <div className="bg-secondary p-4 rounded-2xl mb-5">
          <Utensils className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Chưa có đơn hàng nào</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">Bạn chưa đặt đơn hàng nào. Hãy khám phá ngay các món ngon quanh bạn!</p>
        <Button size="lg" onClick={() => router.push('/')} className="rounded-xl">
          Khám phá quán ngon
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
      {orders.map((order) => (
        <Card 
          key={order.id} 
          className="overflow-hidden border border-border bg-card shadow-sm hover:border-primary/40 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between bg-secondary/20 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" />
                {order.restaurant_name || 'Nhà hàng'}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(order.created_at).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4">
              <div className="space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-foreground/90 flex items-center gap-2">
                      <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs font-semibold">{item.quantity}x</span>
                      {item.name || 'Món ăn'}
                    </span>
                    <span className="text-muted-foreground font-mono">{formatCurrency(Number(item.unit_price))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3.5 flex justify-between font-bold text-base items-center">
                <span className="flex items-center gap-2 text-foreground font-medium"><Receipt className="w-4 h-4 text-muted-foreground" /> Tổng tiền</span>
                <span className="text-primary text-lg font-mono">{formatCurrency(Number(order.total_amount))}</span>
              </div>
            </div>
            
            {order.review && (
              <div className="mt-5 p-3.5 bg-secondary/30 rounded-xl border border-border text-xs sm:text-sm text-foreground/90 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <p className="font-semibold mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Đánh giá của bạn</span>
                  </p>
                  <span className="text-amber-400 tracking-wider text-sm">{'★'.repeat(order.review.restaurant_rating || 0)}</span>
                </div>
                <p className="italic text-muted-foreground leading-relaxed">&ldquo;{order.review.comment}&rdquo;</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-secondary/10 border-t border-border flex justify-end gap-2.5 pt-3.5 pb-3.5">
            {order.status === 'COMPLETED' && !order.review && (
              <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setReviewOrderId(order.id)}>
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Đánh giá
              </Button>
            )}
            <Button size="sm" onClick={() => handleReorder(order)} className="rounded-xl text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Đặt lại
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
