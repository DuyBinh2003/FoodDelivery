"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, ShoppingBag, X, Flame, Sparkles, Tag as TagIcon, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore, CartItemType, ClearCartModal } from '@/features/cart';
import type { AddToCartDialogProps } from './types';
import type { MenuItem } from '@/features/menu/types';

const QUICK_INSTRUCTION_TAGS = [
  'Không hành',
  'Ít cay',
  'Không cay',
  'Để riêng nước dùng',
  'Nhiều rau',
  'Không tiêu',
  'Ít ngọt',
  'Để riêng đá',
];

interface AddToCartModalInnerProps {
  item: MenuItem;
  restaurantId: string;
  onClose: () => void;
}

function AddToCartModalInner({ item, restaurantId, onClose }: AddToCartModalInnerProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItemType | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showClearCartModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClearCartModal, onClose]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const buildCartItem = (): CartItemType => {
    const options: string[] = [];
    if (selectedTags.length > 0) {
      options.push(...selectedTags);
    }
    if (customNote.trim()) {
      options.push(customNote.trim());
    }

    // Generate unique identifier based on item id and options
    const uniqueOptionsSuffix = options.length > 0 ? `-${options.slice().sort().join('|')}` : '';
    const cartItemId = `${item.id}${uniqueOptionsSuffix}`;

    return {
      id: cartItemId,
      item_id: item.id,
      name: item.name,
      price: item.price,
      quantity,
      image_url: item.image_url,
      options: options.length > 0 ? options : undefined,
    };
  };

  const handleAddToCart = () => {
    if (!item.is_available) return;

    const cartItem = buildCartItem();
    const success = addItem(cartItem, restaurantId);

    if (!success) {
      // Different restaurant in cart: prompt confirmation
      setPendingItem(cartItem);
      setShowClearCartModal(true);
      return;
    }

    onClose();
  };

  const handleConfirmClearCart = () => {
    if (pendingItem) {
      clearCart();
      addItem(pendingItem, restaurantId);
    }
    setShowClearCartModal(false);
    onClose();
  };

  const totalPrice = item.price * quantity;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
      >
        <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
          
          {/* Hero Banner (16:9 Aspect Ratio) */}
          <div className="relative w-full h-52 sm:h-60 bg-zinc-900 shrink-0 overflow-hidden">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 512px"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-950/70 via-zinc-900 to-amber-950/60 flex flex-col items-center justify-center gap-2">
                <Flame className="w-14 h-14 text-orange-500/50" />
                <span className="text-xs uppercase tracking-wider font-semibold text-orange-400/70">Món ngon nóng hổi</span>
              </div>
            )}

            {/* Gradient Overlays for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Top-left Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
              {item.category?.name && (
                <Badge variant="secondary" className="bg-black/60 hover:bg-black/70 backdrop-blur-md text-zinc-200 border-white/10 px-3 py-1 text-xs font-medium">
                  {item.category.name}
                </Badge>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Availability Overlay */}
            {!item.is_available && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-10">
                <Badge variant="destructive" className="px-4 py-1.5 text-sm font-semibold tracking-wide shadow-lg">
                  Tạm hết hàng
                </Badge>
              </div>
            )}
          </div>

          {/* Scrollable Modal Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {/* Title & Price Header */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 id="product-dialog-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {item.name}
                </h2>
                <span className="text-xl sm:text-2xl font-extrabold text-orange-400 shrink-0">
                  {formatCurrency(item.price)}
                </span>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {item.tags.map((tag) => (
                    <span 
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    >
                      <TagIcon className="w-3 h-3" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {item.description ? (
                <p className="text-sm text-zinc-400 leading-relaxed mt-3">
                  {item.description}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic mt-2">
                  Món ăn được chuẩn bị tươi mới theo công thức đặc trưng của quán.
                </p>
              )}
            </div>

            {/* Special Instructions / Notes */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  Yêu cầu đặc biệt
                </label>
                <span className="text-xs text-zinc-500 font-normal">Tùy chọn</span>
              </div>

              {/* Quick toggle suggestion tags */}
              <div className="flex flex-wrap gap-2">
                {QUICK_INSTRUCTION_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-sm shadow-orange-500/10 scale-[1.02]'
                          : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-orange-400 shrink-0" />}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Custom note textarea */}
              <div className="mt-3">
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value.slice(0, 150))}
                  placeholder="Ghi chú thêm cho quán (VD: để riêng muỗng đũa, nước dùng thật sôi...)"
                  rows={2}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all resize-none"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-zinc-500 px-1">
                  <span>Quán sẽ cố gắng phục vụ theo yêu cầu nếu có thể</span>
                  <span>{customNote.length}/150</span>
                </div>
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/5">
              <span className="text-sm font-semibold text-zinc-200">Số lượng</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !item.is_available}
                  className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
                  aria-label="Giảm số lượng"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold min-w-[2.5ch] text-center text-white tabular-nums select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={!item.is_available}
                  className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
                  aria-label="Tăng số lượng"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-950/95 backdrop-blur-md flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer px-4 h-12"
            >
              Hủy
            </Button>
            
            <Button
              type="button"
              onClick={handleAddToCart}
              disabled={!item.is_available}
              className="flex-1 h-12 px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-between transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>{item.is_available ? 'Thêm vào giỏ' : 'Tạm hết món'}</span>
              </div>
              {item.is_available && (
                <span className="font-bold text-sm tracking-wide">
                  {formatCurrency(totalPrice)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation modal if another restaurant is active in cart */}
      <ClearCartModal
        isOpen={showClearCartModal}
        onClose={() => setShowClearCartModal(false)}
        onConfirm={handleConfirmClearCart}
      />
    </>
  );
}

export function AddToCartDialog({ item, restaurantId, isOpen, onClose }: AddToCartDialogProps) {
  if (!isOpen || !item) return null;

  return (
    <AddToCartModalInner
      key={item.id}
      item={item}
      restaurantId={restaurantId}
      onClose={onClose}
    />
  );
}
