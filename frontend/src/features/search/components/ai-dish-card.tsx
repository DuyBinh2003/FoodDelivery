'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, Plus, Check, Sparkles, Store, ExternalLink } from 'lucide-react';
import { useCartStore } from '@/features/cart/store/useCartStore';
import toast from 'react-hot-toast';
import type { SuggestedDish } from '../types/ai.types';

interface AiDishCardProps {
  dish: SuggestedDish;
  onAddedToCart?: () => void;
}

export function AiDishCard({ dish, onAddedToCart }: AiDishCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const handleAddToCart = () => {
    const success = addItem(
      {
        id: dish.dishId,
        item_id: dish.dishId,
        name: dish.dishName,
        price: dish.price,
        quantity: 1,
        image_url: dish.imageUrl,
      },
      dish.restaurantId,
      dish.restaurantName,
    );

    if (success) {
      setIsAdded(true);
      toast.success(`Đã thêm "${dish.dishName}" vào giỏ hàng!`, {
        icon: '🍜',
        duration: 2500,
      });
      if (onAddedToCart) onAddedToCart();
      setTimeout(() => setIsAdded(false), 2000);
    } else {
      toast.error('Giỏ hàng đang chứa món của quán khác. Hãy hoàn tất hoặc xóa giỏ trước nhé!', {
        icon: '⚠️',
        duration: 3500,
      });
    }
  };

  return (
    <div className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" />
            {dish.matchReason || 'Gợi ý phù hợp'}
          </span>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{dish.rating > 0 ? dish.rating.toFixed(1) : '4.8'}</span>
          </div>
        </div>

        {/* Dish Info */}
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-1">
          {dish.dishName}
        </h4>

        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 mb-2.5">
          <Store className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate">{dish.restaurantName}</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
        <span className="text-sm font-extrabold text-orange-400 font-mono">
          {formatVND(dish.price)}
        </span>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/restaurant/${dish.restaurantId}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Xem quán"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm ${
              isAdded
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-emerald-500/20'
                : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Đã thêm</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Thêm</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
