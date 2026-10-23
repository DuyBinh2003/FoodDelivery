'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowRight, X, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { CartItem } from '@/features/cart/components/CartItem';
import { Button } from '@/components/ui/button';

interface FloatingBottomCartProps {
  currentRestaurantId?: string;
  currentRestaurantName?: string;
}

const emptySubscribe = () => () => {};

export function FloatingBottomCart({
  currentRestaurantId,
  currentRestaurantName,
}: FloatingBottomCartProps) {
  const router = useRouter();
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const items = useCartStore((state) => state.items);
  const cartRestaurantId = useCartStore((state) => state.restaurantId);
  const cartRestaurantName = useCartStore((state) => state.restaurantName);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const clearCart = useCartStore((state) => state.clearCart);

  if (!isMounted) return null;

  const totalItems = getTotalItems();
  const subtotal = getSubtotal();

  if (totalItems === 0) return null;

  const isDifferentRestaurant = Boolean(
    currentRestaurantId && cartRestaurantId && cartRestaurantId !== currentRestaurantId,
  );

  return (
    <>
      {/* 1. Floating Bottom Bar */}
      <aside 
        aria-label="Giỏ hàng đang chọn"
        className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-4xl mx-auto z-40 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
      >
        {/* Left Side: Cart Info */}
        <div 
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsDrawerOpen(true);
            }
          }}
        >
          <div className="relative p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-foreground text-background font-bold text-[11px] flex items-center justify-center shadow-md tabular-nums">
              {totalItems}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-foreground tracking-tight tabular-nums">
                {formatCurrency(subtotal)}
              </span>
              {isDifferentRestaurant ? (
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Đơn từ {cartRestaurantName || 'quán khác'}
                </span>
              ) : currentRestaurantName ? (
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {currentRestaurantName}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate flex items-center gap-1 group-hover:text-primary transition-colors">
              <span>{totalItems} món đã chọn</span>
              <span className="text-muted-foreground/40">•</span>
              <span>Chạm để xem chi tiết</span>
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsDrawerOpen(true)}
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground rounded-xl text-xs sm:text-sm font-semibold h-10 px-3 cursor-pointer"
          >
            Xem giỏ hàng
          </Button>

          <Button
            type="button"
            onClick={() => router.push('/checkout')}
            className="h-10 sm:h-11 px-4 sm:px-5 font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer active:scale-95 transition-all"
          >
            <span>Thanh toán</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* 2. Slide-out Cart Drawer */}
      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-card/60 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-foreground">
                    Giỏ hàng của bạn
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {cartRestaurantName ? `Quán: ${cartRestaurantName}` : `${totalItems} món đang chờ đặt`}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
                aria-label="Đóng giỏ hàng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning if from different restaurant */}
            {isDifferentRestaurant && (
              <div className="p-3 mx-4 mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                Món trong giỏ thuộc nhà hàng khác. Đặt món tại quán này sẽ yêu cầu tạo đơn mới hoặc xóa giỏ hàng cũ.
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <CartItem id={item.id} />
                </div>
              ))}
            </div>

            {/* Footer Summary & Checkout */}
            <div className="p-4 sm:p-5 border-t border-border bg-card/90 backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tạm tính ({totalItems} món)</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearCart();
                    setIsDrawerOpen(false);
                  }}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground rounded-xl text-xs h-11 cursor-pointer"
                >
                  Xóa giỏ
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push('/checkout');
                  }}
                  className="flex-1 h-11 font-semibold rounded-xl flex items-center justify-between px-5 text-sm cursor-pointer active:scale-98 transition-all"
                >
                  <span>Tiến hành đặt món</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
