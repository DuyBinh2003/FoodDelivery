'use client';

import React from 'react';
import Image from 'next/image';
import {
  X,
  UtensilsCrossed,
  Tag as TagIcon,
  Layers,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MessageSquare,
  Sparkles,
  ChefHat,
} from 'lucide-react';
import type { PartnerMenuItem } from '@/features/restaurant/types/partner.types';

interface FoodItemDetailDialogProps {
  item: PartnerMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: PartnerMenuItem) => void;
  onToggleAvailability?: (item: PartnerMenuItem) => Promise<void> | void;
  customerComment?: string | null;
  customerOptions?: string[] | null;
  orderId?: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatDate = (dateInput?: string) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function FoodItemDetailDialog({
  item,
  isOpen,
  onClose,
  onEdit,
  onToggleAvailability,
  customerComment,
  customerOptions,
  orderId,
}: FoodItemDetailDialogProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Chi tiết món ăn</h2>
              <span className="text-[11px] text-zinc-400 font-mono">#{item.id.slice(0, 8)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Hero Image */}
          <div className="relative h-56 sm:h-64 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-inner group">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 500px"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <UtensilsCrossed className="w-12 h-12 mb-2 stroke-[1.5]" />
                <span className="text-xs text-zinc-500">Chưa có ảnh món ăn</span>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Category Pill */}
            {item.category && (
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-black/70 backdrop-blur-md text-orange-400 border border-white/15 flex items-center gap-1.5 shadow-lg">
                <Layers className="w-3.5 h-3.5" />
                <span>{item.category.name}</span>
              </div>
            )}

            {/* Availability Status Badge */}
            <div className="absolute top-3 right-3">
              {item.is_available ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/90 text-white backdrop-blur-md shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đang phục vụ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800/90 text-zinc-300 border border-white/10 backdrop-blur-md shadow-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  Tạm hết món
                </span>
              )}
            </div>

            {/* Price Banner */}
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                {item.original_price && Number(item.original_price) > Number(item.price) && (
                  <span className="px-2 py-0.5 rounded-lg text-xs font-semibold text-zinc-400 line-through bg-black/60 backdrop-blur-md">
                    {formatCurrency(Number(item.original_price))}
                  </span>
                )}
                <div className="px-3.5 py-1.5 rounded-xl text-base font-extrabold bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/30 font-mono">
                  {formatCurrency(Number(item.price) || 0)}
                </div>
              </div>
              <div className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                Quán thực nhận (80%): {formatCurrency(Math.round(Number(item.price) * 0.8) || 0)}
              </div>
            </div>
          </div>

          {/* Title & Core Details */}
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">{item.name}</h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
              {item.category && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{item.category.name}</span>
                </span>
              )}
              {item.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Tạo ngày: {formatDate(item.created_at)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Customer Customization & Notes (Always prominent for Kitchen & Partner) */}
          <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/35 rounded-2xl p-4 shadow-lg shadow-amber-500/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                </span>
                <span>Yêu cầu & Ghi chú từ khách hàng</span>
              </h4>
              {orderId ? (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Đơn #{orderId.slice(0, 8)}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  Yêu cầu chế biến
                </span>
              )}
            </div>

            {/* Customization Options Badges */}
            <div className="space-y-2.5">
              {customerOptions && customerOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {customerOptions.map((opt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/25 text-amber-200 border border-amber-500/40 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{opt}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Order Message / Customer Comment Callout */}
              {customerComment && (
                <div className="bg-zinc-950/75 border border-amber-500/25 rounded-xl p-3 text-xs text-amber-100 flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase shrink-0 mt-0.5">
                    Tin nhắn khách
                  </span>
                  <span className="font-medium leading-relaxed italic text-amber-100">
                    &ldquo;{customerComment}&rdquo;
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-zinc-500" />
              <span>Mô tả & Thành phần chế biến</span>
            </h4>
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
              {item.description || 'Chưa có mô tả chi tiết cho món ăn này.'}
            </p>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-zinc-500" />
                <span>Nhãn đặc trưng (Tags)</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-xl text-xs font-medium bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Options / Modifiers configured for dish */}
          {item.options && item.options.length > 0 && (
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Nhóm tùy chọn & Topping ({item.options.length} nhóm)</span>
              </h4>
              <div className="space-y-2.5">
                {item.options.map((group) => (
                  <div key={group.id} className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{group.name}</span>
                      <span className="text-[10px] text-zinc-400">
                        {group.required ? 'Bắt buộc' : 'Tùy chọn'} • Tối đa {group.max_choices || 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.choices.map((c) => (
                        <span key={c.id} className="px-2 py-0.5 rounded-lg text-[11px] bg-zinc-800 text-zinc-300 border border-white/5">
                          {c.name} {c.price > 0 ? `(+${formatCurrency(c.price)})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Quick Availability Toggle */}
          {onToggleAvailability ? (
            <button
              onClick={() => onToggleAvailability(item)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${item.is_available
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${item.is_available ? 'bg-zinc-500' : 'bg-emerald-400 animate-pulse'
                  }`}
              />
              <span>{item.is_available ? 'Đánh dấu Tạm hết' : 'Kích hoạt Còn món'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa món</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
