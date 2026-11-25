'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FoodCardProps } from './types';

export default function FoodCard({
  item,
  index,
  mode = 'menu',
  isRestaurantClosed = false,
  onSelect,
}: FoodCardProps) {
  const gradients = [
    'from-emerald-500/15 to-teal-500/15',
    'from-lime-500/15 to-emerald-500/15',
    'from-amber-500/15 to-lime-500/15',
    'from-teal-500/15 to-cyan-500/15',
    'from-green-500/15 to-emerald-500/15',
  ];
  const gradient = gradients[index % gradients.length];

  const isSoldOut = !item.is_available;
  const isDisabled = isSoldOut || isRestaurantClosed;

  const hasDiscount = Boolean(item.original_price && Number(item.original_price) > Number(item.price));
  const discountPercent =
    hasDiscount && item.original_price
      ? Math.round(((Number(item.original_price) - Number(item.price)) / Number(item.original_price)) * 100)
      : 0;

  const cardContent = (
    <Card
      className={`group flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-card border border-border transition-all duration-300 ease-out select-none ${isDisabled
          ? 'opacity-65 cursor-not-allowed'
          : 'hover:border-primary/45 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer'
        }`}
    >
      {/* Image banner */}
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            unoptimized
            className={`object-cover transition-transform duration-500 ease-out ${isDisabled ? 'grayscale contrast-75 brightness-75' : 'group-hover:scale-105'
              }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Flame className="w-12 h-12 text-primary/40 group-hover:text-primary/60 group-hover:scale-110 transition-all duration-500" />
          </div>
        )}

        {/* Top-right Price Badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-10">
          <Badge className="bg-black/75 backdrop-blur-md text-white font-bold border-none px-3 py-1 text-xs shadow-md">
            {formatCurrency(item.price)}
          </Badge>
          {hasDiscount && (
            <Badge className="bg-destructive text-white font-extrabold text-[10px] px-2 py-0.5 border-none shadow-sm">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Top-left Options Indicator */}
        {item.options && item.options.length > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/15">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              Tùy chọn
            </span>
          </div>
        )}

        {isSoldOut ? (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-xs z-20">
            <Badge variant="destructive" className="px-4 py-1.5 text-sm font-bold shadow-lg uppercase tracking-wider">
              Hết hàng
            </Badge>
          </div>
        ) : isRestaurantClosed ? (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs z-20">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
              Quán tạm đóng
            </Badge>
          </div>
        ) : null}
      </div>

      <CardContent className="flex-1 p-4 pb-2">
        <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1">
          {item.name}
        </h3>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-extrabold text-primary">{formatCurrency(item.price)}</span>
          {hasDiscount && item.original_price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(item.original_price)}
            </span>
          )}
        </div>

        {item.description ? (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic mt-1.5 line-clamp-1">
            Món ngon chuẩn bị tươi mới mỗi ngày
          </p>
        )}

        {item.restaurant_name && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-1 flex items-center gap-1">
            <span>Quán:</span>
            <span className="text-foreground/80 font-semibold">{item.restaurant_name}</span>
          </p>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border"
              >
                #{tag.name}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground font-medium px-1 py-0.5">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t-0 bg-transparent">
        <button
          type="button"
          disabled={isDisabled}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-semibold transition-all duration-200 ${isDisabled
              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
              : 'bg-primary/10 text-primary border-primary/25 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary cursor-pointer active:scale-98'
            }`}
        >
          <span className="text-xs sm:text-sm">
            {isSoldOut
              ? 'Tạm hết'
              : isRestaurantClosed
                ? 'Tạm đóng'
                : mode === 'restaurant'
                  ? 'Thêm vào giỏ'
                  : 'Xem chi tiết'}
          </span>
          {!isDisabled && <Plus className="w-4 h-4" />}
        </button>
      </CardFooter>
    </Card>
  );

  if (isDisabled || onSelect) {
    return (
      <div
        onClick={() => {
          if (!isDisabled && onSelect) {
            onSelect(item);
          }
        }}
        className={isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        role={onSelect ? 'button' : undefined}
        tabIndex={isDisabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!isDisabled && onSelect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect(item);
          }
        }}
      >
        {cardContent}
      </div>
    );
  }

  return <Link href={`/restaurant/${item.restaurant_id}?item=${item.id}`}>{cardContent}</Link>;
}
