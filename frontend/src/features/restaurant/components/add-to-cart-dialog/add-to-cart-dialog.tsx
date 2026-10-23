'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Minus,
  Plus,
  ShoppingBag,
  X,
  Flame,
  Tag as TagIcon,
  Check,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore, CartItemType, ClearCartModal, SelectedModifier } from '@/features/cart';
import type { AddToCartDialogProps } from './types';
import type { MenuItem, MenuItemOptionChoice, MenuItemOptionGroup } from '@/features/menu/types';

interface AddToCartModalInnerProps {
  item: MenuItem;
  restaurantId: string;
  restaurantName?: string;
  onClose: () => void;
}

function AddToCartModalInner({ item, restaurantId, restaurantName, onClose }: AddToCartModalInnerProps) {
  const [quantity, setQuantity] = useState(1);
  const [customNote, setCustomNote] = useState('');
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItemType | null>(null);

  // Map of single-choice groups (e.g. Size, Ice, Sugar): groupId -> choice
  const [singleChoices, setSingleChoices] = useState<Record<string, MenuItemOptionChoice>>(() => {
    if (!item.options || item.options.length === 0) return {};
    const initialSingle: Record<string, MenuItemOptionChoice> = {};
    item.options.forEach((group) => {
      const isSingleChoice = group.required && group.max_choices === 1;
      if (isSingleChoice) {
        const defaultChoice = group.choices.find((c) => c.is_default) || group.choices[0];
        if (defaultChoice) {
          initialSingle[group.id] = defaultChoice;
        }
      }
    });
    return initialSingle;
  });

  // Map of multi-choice groups (e.g. Toppings): groupId -> MenuItemOptionChoice[]
  const [multiChoices, setMultiChoices] = useState<Record<string, MenuItemOptionChoice[]>>(() => {
    if (!item.options || item.options.length === 0) return {};
    const initialMulti: Record<string, MenuItemOptionChoice[]> = {};
    item.options.forEach((group) => {
      const isSingleChoice = group.required && group.max_choices === 1;
      if (!isSingleChoice) {
        initialMulti[group.id] = group.choices.filter((c) => c.is_default);
      }
    });
    return initialMulti;
  });

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

  // Validation: ensure all required groups have a selection
  const missingRequiredGroup = useMemo(() => {
    if (!item.options || item.options.length === 0) return null;

    for (const group of item.options) {
      if (group.required) {
        const isSingle = group.max_choices === 1;
        if (isSingle) {
          if (!singleChoices[group.id]) {
            return group.name;
          }
        } else {
          const selected = multiChoices[group.id] || [];
          const min = group.min_choices ?? 1;
          if (selected.length < min) {
            return group.name;
          }
        }
      }
    }
    return null;
  }, [item.options, singleChoices, multiChoices]);

  const isValid = !missingRequiredGroup && item.is_available;

  // Toggle single choice (Radio)
  const handleSelectSingleChoice = (groupId: string, choice: MenuItemOptionChoice) => {
    setSingleChoices((prev) => ({
      ...prev,
      [groupId]: choice,
    }));
  };

  // Toggle multi choice (Checkbox)
  const handleToggleMultiChoice = (
    group: MenuItemOptionGroup,
    choice: MenuItemOptionChoice,
  ) => {
    setMultiChoices((prev) => {
      const currentList = prev[group.id] || [];
      const isAlreadySelected = currentList.some((c) => c.id === choice.id);

      if (isAlreadySelected) {
        return {
          ...prev,
          [group.id]: currentList.filter((c) => c.id !== choice.id),
        };
      }

      // Check max choices
      if (group.max_choices && currentList.length >= group.max_choices) {
        return prev;
      }

      return {
        ...prev,
        [group.id]: [...currentList, choice],
      };
    });
  };

  // Calculate real-time modifier price delta
  const modifiersPrice = useMemo(() => {
    let sum = 0;
    Object.values(singleChoices).forEach((choice) => {
      sum += Number(choice.price || 0);
    });
    Object.values(multiChoices).forEach((choices) => {
      choices.forEach((choice) => {
        sum += Number(choice.price || 0);
      });
    });
    return sum;
  }, [singleChoices, multiChoices]);

  const unitPrice = Number(item.price) + modifiersPrice;
  const totalPrice = unitPrice * quantity;

  // Build CartItem object
  const buildCartItem = (): CartItemType => {
    const selectedModifiers: SelectedModifier[] = [];
    const optionStrings: string[] = [];

    if (item.options && item.options.length > 0) {
      item.options.forEach((group) => {
        const isSingle = group.required && group.max_choices === 1;
        if (isSingle) {
          const choice = singleChoices[group.id];
          if (choice) {
            selectedModifiers.push({
              groupId: group.id,
              groupName: group.name,
              choiceId: choice.id,
              choiceName: choice.name,
              price: choice.price,
            });
            optionStrings.push(
              choice.price > 0
                ? `${choice.name} (+${formatCurrency(choice.price)})`
                : choice.name
            );
          }
        } else {
          const choices = multiChoices[group.id] || [];
          choices.forEach((choice) => {
            selectedModifiers.push({
              groupId: group.id,
              groupName: group.name,
              choiceId: choice.id,
              choiceName: choice.name,
              price: choice.price,
            });
            optionStrings.push(
              choice.price > 0
                ? `${choice.name} (+${formatCurrency(choice.price)})`
                : choice.name
            );
          });
        }
      });
    }

    // Build unique identifier based on options and custom note
    const trimmedNote = customNote.trim();
    const uniqueOptionsSuffix = optionStrings.length > 0
      ? `-${optionStrings.slice().sort().join('|')}`
      : '';
    const noteSuffix = trimmedNote ? `-note:${trimmedNote}` : '';
    const cartItemId = `${item.id}${uniqueOptionsSuffix}${noteSuffix}`;

    return {
      id: cartItemId,
      item_id: item.id,
      name: item.name,
      price: unitPrice,
      quantity,
      image_url: item.image_url,
      options: optionStrings.length > 0 ? optionStrings : undefined,
      selected_modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
      note: trimmedNote || undefined,
    };
  };

  const handleAddToCart = () => {
    if (!isValid) return;

    const cartItem = buildCartItem();
    const success = addItem(cartItem, restaurantId, restaurantName || item.restaurant_name);

    if (!success) {
      // Single Restaurant Policy: different restaurant already in cart
      setPendingItem(cartItem);
      setShowClearCartModal(true);
      return;
    }

    onClose();
  };

  const handleConfirmClearCart = () => {
    if (pendingItem) {
      clearCart();
      addItem(pendingItem, restaurantId, restaurantName || item.restaurant_name);
    }
    setShowClearCartModal(false);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
      >
        <div className="relative w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">

          {/* Hero Banner */}
          <div className="relative w-full h-44 sm:h-56 bg-muted shrink-0 overflow-hidden">
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
              <div className="w-full h-full bg-secondary/50 flex flex-col items-center justify-center gap-2">
                <Flame className="w-10 h-10 text-primary/60" />
                <span className="text-xs uppercase tracking-wider font-semibold text-primary/80">Món ngon nóng hổi</span>
              </div>
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Category Badge */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
              {item.category?.name && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-foreground border-border px-3 py-1 text-xs font-medium">
                  {item.category.name}
                </Badge>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-background/80 backdrop-blur-md text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
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
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Title & Base Price */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 id="product-dialog-title" className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-snug">
                  {item.name}
                </h2>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(item.price)}
                  </span>
                  {item.original_price && item.original_price > item.price && (
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {formatCurrency(item.original_price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      <TagIcon className="w-3 h-3" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {item.description ? (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5">
                  {item.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/70 italic mt-2">
                  Món ăn được chuẩn bị tươi mới theo tiêu chuẩn của quán.
                </p>
              )}
            </div>

            {/* Modifier Groups (Size, Toppings, Level) */}
            {item.options && item.options.length > 0 && (
              <div className="space-y-6 pt-2 border-t border-border">
                {item.options.map((group) => {
                  const isSingleChoice = group.required && group.max_choices === 1;

                  return (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-bold text-foreground">
                            {group.name}
                          </label>
                          {group.required ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/25">
                              Bắt buộc
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-normal">
                              Tùy chọn
                            </span>
                          )}
                        </div>
                        {group.max_choices && group.max_choices > 1 && (
                          <span className="text-[11px] text-muted-foreground">
                            Tối đa {group.max_choices} lựa chọn
                          </span>
                        )}
                      </div>

                      {/* Group choices list */}
                      <div className="space-y-2">
                        {group.choices.map((choice) => {
                          const isSelected = isSingleChoice
                            ? singleChoices[group.id]?.id === choice.id
                            : (multiChoices[group.id] || []).some((c) => c.id === choice.id);

                          return (
                            <button
                              key={choice.id}
                              type="button"
                              onClick={() => {
                                if (isSingleChoice) {
                                  handleSelectSingleChoice(group.id, choice);
                                } else {
                                  handleToggleMultiChoice(group, choice);
                                }
                              }}
                              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/10 border-primary text-foreground'
                                  : 'bg-secondary/30 border-border hover:border-muted-foreground/30 hover:bg-secondary/60 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 flex items-center justify-center transition-all ${
                                    isSingleChoice ? 'rounded-full' : 'rounded-md'
                                  } ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'border border-border bg-secondary'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-foreground font-bold' : 'text-foreground/90'}`}>
                                  {choice.name}
                                </span>
                              </div>

                              <span className="text-xs font-semibold text-primary tabular-nums">
                                {choice.price > 0 ? `+${formatCurrency(choice.price)}` : '0đ'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Note for restaurant */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="custom-item-note"
                  className="text-sm font-semibold text-foreground"
                >
                  Ghi chú cho quán
                </label>
                <span className="text-xs text-muted-foreground font-normal">Không bắt buộc</span>
              </div>
              <textarea
                id="custom-item-note"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value.slice(0, 150))}
                placeholder="Ghi chú thêm cho quán (VD: để riêng nước dùng, không hành...)"
                rows={2}
                className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
                <span>Quán sẽ chuẩn bị theo yêu cầu nếu có thể</span>
                <span className="tabular-nums">{customNote.length}/150</span>
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="pt-2 border-t border-border flex items-center justify-between p-3.5 bg-secondary/30 rounded-xl border border-border">
              <span className="text-sm font-semibold text-foreground">Số lượng</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !item.is_available}
                  className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 border border-border disabled:opacity-30 disabled:hover:bg-secondary disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-all active:scale-95 cursor-pointer"
                  aria-label="Giảm số lượng"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-base font-bold min-w-[2.5ch] text-center text-foreground tabular-nums select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={!item.is_available}
                  className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 border border-border disabled:opacity-30 disabled:hover:bg-secondary disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-all active:scale-95 cursor-pointer"
                  aria-label="Tăng số lượng"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar with Real-time Total Price */}
          <div className="p-4 sm:p-5 border-t border-border bg-card/95 backdrop-blur-md flex flex-col gap-2 shrink-0">
            {missingRequiredGroup && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium px-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Vui lòng chọn: <strong>{missingRequiredGroup}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground rounded-xl cursor-pointer px-4 h-11"
              >
                Hủy
              </Button>

              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={!isValid}
                className="flex-1 h-11 px-5 font-semibold rounded-xl flex items-center justify-between transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{item.is_available ? 'Thêm vào giỏ hàng' : 'Tạm hết món'}</span>
                </div>
                {item.is_available && (
                  <span className="font-bold text-sm sm:text-base tracking-wide tabular-nums">
                    {formatCurrency(totalPrice)}
                  </span>
                )}
              </Button>
            </div>
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
      restaurantName={item.restaurant_name}
      onClose={onClose}
    />
  );
}
