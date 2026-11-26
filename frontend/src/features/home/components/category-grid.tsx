'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UtensilsCrossed,
  Soup,
  Coffee,
  Drumstick,
  Cookie,
  Flame,
  Sandwich,
  Pizza,
  Leaf,
  ChevronRight,
} from 'lucide-react';
import type { HomeCategoryItem } from '@/features/home/utils/home-feed.utils';

interface CategoryGridProps {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  categories?: HomeCategoryItem[];
}

function renderGridIcon(category: HomeCategoryItem) {
  if (category.id === 'ALL') {
    return <UtensilsCrossed className="w-6 h-6" />;
  }
  if (category.icon_url && category.icon_url.startsWith('http')) {
    return (
      <Image
        src={category.icon_url}
        alt={category.name}
        width={28}
        height={28}
        unoptimized
        className="w-7 h-7 rounded-lg object-cover"
      />
    );
  }
  const lower = category.name.toLowerCase();
  if (lower.includes('phở') || lower.includes('bún')) return <Soup className="w-6 h-6" />;
  if (lower.includes('trà') || lower.includes('cà phê') || lower.includes('giải khát')) {
    return <Coffee className="w-6 h-6" />;
  }
  if (lower.includes('gà') || lower.includes('burger')) return <Drumstick className="w-6 h-6" />;
  if (lower.includes('bánh mì')) return <Sandwich className="w-6 h-6" />;
  if (lower.includes('pizza') || lower.includes('mì ý')) return <Pizza className="w-6 h-6" />;
  if (lower.includes('chay')) return <Leaf className="w-6 h-6" />;
  if (lower.includes('cơm')) return <Flame className="w-6 h-6" />;
  if (lower.includes('vặt') || lower.includes('bánh')) return <Cookie className="w-6 h-6" />;
  return <UtensilsCrossed className="w-6 h-6" />;
}

export function CategoryGrid({
  selectedCategoryId,
  onSelectCategory,
  categories = [],
}: CategoryGridProps) {
  const items: HomeCategoryItem[] = [{ id: 'ALL', name: 'Tất cả' }, ...categories];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground tracking-tight">
          Danh mục ẩm thực
        </h3>
        <Link
          href="/menu"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
        >
          <span>Xem tất cả</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2.5 sm:gap-3">
        {items.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
            >
              <div
                className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center transition-all duration-150 border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-foreground/80 border-border group-hover:border-primary/40 group-hover:text-primary'
                }`}
              >
                {renderGridIcon(cat)}
              </div>
              <span className="text-[11px] font-medium text-center line-clamp-1 text-foreground/85">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
