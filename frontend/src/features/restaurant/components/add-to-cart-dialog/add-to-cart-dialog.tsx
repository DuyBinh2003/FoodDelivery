"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore, CartItemType } from '@/features/cart';
import type { AddToCartDialogProps } from './types';

export function AddToCartDialog({ item, restaurantId, isOpen, onClose }: AddToCartDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  // Reset quantity when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleAddToCart = () => {
    const cartItem: CartItemType = {
      id: item.id,
      item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: quantity,
    };

    addItem(cartItem, restaurantId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white line-clamp-2">{item.name}</h2>
            <p className="text-orange-400 font-semibold mt-1">
              {formatCurrency(item.price)}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center gap-6">
          <div className="flex items-center gap-6 bg-black/40 p-2 rounded-2xl border border-white/5">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Minus className="w-5 h-5 text-white" />
            </button>
            <span className="text-2xl font-bold min-w-[3ch] text-center text-white">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-3 mt-auto">
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5 hover:text-white text-zinc-300">
            Hủy
          </Button>
          <Button 
            onClick={handleAddToCart}
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Thêm {formatCurrency(item.price * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
