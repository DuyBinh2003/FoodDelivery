"use client";

import React, { useState } from 'react';
import { ShoppingBag, ChevronRight, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { CartItem } from './CartItem';
import { useRouter } from 'next/navigation';

export const CartWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const router = useRouter();
  
  const totalItems = getTotalItems();
  const subtotal = getSubtotal();

  if (totalItems === 0) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center bg-background text-primary text-[10px] font-bold rounded-full border border-primary/20">
              {totalItems}
            </span>
          </div>
          <span className="font-semibold tabular-nums">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}
          </span>
        </button>
      )}

      {/* Cart Drawer */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-card text-card-foreground shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg text-foreground">Giỏ hàng</h2>
                <span className="bg-muted text-muted-foreground text-xs py-0.5 px-2 rounded-full font-medium">
                  {totalItems} món
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.map((item) => (
                <CartItem key={item.id} id={item.id} />
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/checkout');
                }}
                className="w-full flex items-center justify-between py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors group cursor-pointer shadow-sm"
              >
                <span>Thanh toán</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
