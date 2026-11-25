'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useOrderHistory } from '@/features/orders/hooks/useOrderHistory';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge/status-badge';
import { OrderReviewModal } from '@/features/orders/components/OrderReviewModal';
import { Order, OrderItem } from '@/features/orders/types';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';
import {
  PackageOpen,
  Clock,
  Receipt,
  RotateCcw,
  MessageSquare,
  Utensils,
  Search,
  ExternalLink,
} from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

type HistoryFilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const SkeletonCard = () => (
  <Card className="overflow-hidden border border-border bg-card animate-pulse">
    <CardHeader className="bg-secondary/40 pb-4 border-b border-border">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted/70 rounded" />
        </div>
        <div className="h-6 w-24 bg-muted rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="pt-6 space-y-4">
      <div className="flex justify-between">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded" />
      </div>
      <div className="border-t border-border pt-4 mt-4 flex justify-between">
        <div className="h-5 w-16 bg-muted rounded" />
        <div className="h-5 w-24 bg-muted rounded" />
      </div>
    </CardContent>
    <CardFooter className="bg-secondary/20 border-t border-border pt-4 justify-end">
      <div className="h-9 w-28 bg-muted rounded-xl" />
    </CardFooter>
  </Card>
);

export const OrderHistoryList = () => {
  const { data: orders, isLoading, error } = useOrderHistory();
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<HistoryFilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const setCartItems = useCartStore((state) => state.setItems);
  const { validateCart } = useCartValidation();

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      if (filterTab === 'ACTIVE') {
        if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
      } else if (filterTab === 'COMPLETED' && order.status !== 'COMPLETED') {
        return false;
      } else if (filterTab === 'CANCELLED' && order.status !== 'CANCELLED') {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchRest = (order.restaurant_name || '').toLowerCase().includes(q);
        const matchId = order.id.toLowerCase().includes(q);
        const matchItem = (order.items || []).some((it) =>
          (it.name || '').toLowerCase().includes(q),
        );
        return matchRest || matchId || matchItem;
      }

      return true;
    });
  }, [orders, filterTab, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border text-center">
        <PackageOpen className="w-14 h-14 text-muted-foreground mb-4" />
        <h3 className="font-heading text-lg font-bold text-foreground mb-2">Đã có lỗi xảy ra</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          Không thể tải danh sách đơn hàng lúc này. Vui lòng thử lại sau.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">
          Thử lại
        </Button>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border text-center">
        <div className="bg-primary/12 text-primary p-4 rounded-2xl mb-5">
          <Utensils className="w-10 h-10" />
        </div>
        <h3 className="font-heading text-xl font-bold text-foreground mb-2">Chưa có đơn hàng nào</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          Bạn chưa đặt đơn hàng nào. Hãy khám phá ngay các món ngon quanh bạn!
        </p>
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
      const confirmClear = window.confirm(
        'Giỏ hàng của bạn đang chứa món từ nhà hàng khác. Bạn có muốn xoá giỏ hàng hiện tại để đặt lại đơn này không?',
      );
      if (!confirmClear) {
        return;
      }
    }

    const cartItems = order.items.map((item: OrderItem) => ({
      id: item.menu_item_id || item.id,
      item_id: item.menu_item_id,
      name: item.name || 'Món ăn',
      price: Number(item.unit_price),
      quantity: item.quantity,
    }));

    setCartItems(cartItems, order.restaurant_id);

    const res = await validateCart();
    if (res.isValid) {
      router.push('/checkout');
    } else {
      alert(res.message || 'Có lỗi xảy ra khi xác thực giỏ hàng.');
      router.push('/checkout');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'ALL', label: `Tất cả (${orders.length})` },
              {
                id: 'ACTIVE',
                label: `Đang xử lý (${orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length})`,
              },
              {
                id: 'COMPLETED',
                label: `Hoàn thành (${orders.filter((o) => o.status === 'COMPLETED').length})`,
              },
              {
                id: 'CANCELLED',
                label: `Đã hủy (${orders.filter((o) => o.status === 'CANCELLED').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-60">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên quán, món ăn..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border text-sm text-muted-foreground">
          Không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="overflow-hidden border border-border bg-card shadow-xs hover:border-primary/40 transition-colors"
            >
              <CardHeader className="flex flex-row items-center justify-between bg-secondary/40 pb-4 border-b border-border gap-3">
                <div className="min-w-0">
                  <CardTitle className="font-heading text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{order.restaurant_name || 'Nhà hàng'}</span>
                  </CardTitle>
                  <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleString('vi-VN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span className="font-mono text-[11px]">#{order.id.slice(0, 8)}</span>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </CardHeader>

              <CardContent className="pt-5">
                <div className="flex flex-col gap-4">
                  <div className="space-y-2.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <span className="bg-primary/12 text-primary px-2 py-0.5 rounded-md text-xs font-bold">
                            {item.quantity}x
                          </span>
                          {item.name || 'Món ăn'}
                        </span>
                        <span className="text-muted-foreground font-mono">
                          {formatCurrency(Number(item.unit_price))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-3.5 flex justify-between font-bold text-base items-center">
                    <span className="flex items-center gap-2 text-foreground font-semibold">
                      <Receipt className="w-4 h-4 text-muted-foreground" /> Tổng tiền
                    </span>
                    <span className="text-primary text-lg font-mono font-extrabold">
                      {formatCurrency(Number(order.total_amount))}
                    </span>
                  </div>
                </div>

                {order.review && (
                  <div className="mt-5 p-3.5 bg-secondary/50 rounded-xl border border-border text-xs sm:text-sm text-foreground">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span>Đánh giá của bạn</span>
                      </p>
                      <span className="text-amber-500 tracking-wider text-sm">
                        {'★'.repeat(order.review.restaurant_rating || 0)}
                      </span>
                    </div>
                    <p className="italic text-muted-foreground leading-relaxed">
                      &ldquo;{order.review.comment}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-secondary/20 border-t border-border flex flex-wrap justify-between gap-2.5 pt-3.5 pb-3.5">
                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Theo dõi chi tiết
                </Link>

                <div className="flex items-center gap-2">
                  {order.status === 'COMPLETED' && !order.review && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => setReviewOrderId(order.id)}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Đánh giá
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleReorder(order)} className="rounded-xl text-xs">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Đặt lại
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <OrderReviewModal
        isOpen={!!reviewOrderId}
        orderId={reviewOrderId!}
        onClose={() => setReviewOrderId(null)}
      />
    </div>
  );
};
