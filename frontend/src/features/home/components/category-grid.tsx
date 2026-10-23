'use client';

import React from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Soup,
  Coffee,
  Drumstick,
  Cookie,
  Flame,
  Sandwich,
  ChevronRight,
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  badge?: string;
  gradient: string;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'ALL',
    name: 'Tất cả',
    iconName: 'all',
    gradient: 'from-amber-500/20 to-orange-500/20 text-amber-400',
  },
  {
    id: 'com',
    name: 'Cơm',
    iconName: 'rice',
    gradient: 'from-orange-500/20 to-red-500/20 text-orange-400',
  },
  {
    id: 'pho-bun',
    name: 'Phở & Bún',
    iconName: 'soup',
    gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
  },
  {
    id: 'tra-sua',
    name: 'Trà sữa',
    iconName: 'tea',
    badge: 'HOT',
    gradient: 'from-pink-500/20 to-rose-500/20 text-pink-400',
  },
  {
    id: 'ga-ran',
    name: 'Gà rán',
    iconName: 'chicken',
    gradient: 'from-amber-500/20 to-yellow-500/20 text-amber-400',
  },
  {
    id: 'banh-mi',
    name: 'Bánh mì',
    iconName: 'sandwich',
    gradient: 'from-lime-500/20 to-emerald-500/20 text-lime-400',
  },
  {
    id: 'an-vat',
    name: 'Ăn vặt',
    iconName: 'snack',
    gradient: 'from-violet-500/20 to-purple-500/20 text-violet-400',
  },
  {
    id: 'ca-phe',
    name: 'Cà phê',
    iconName: 'coffee',
    gradient: 'from-cyan-500/20 to-blue-500/20 text-cyan-400',
  },
];

interface CategoryGridProps {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryGrid({
  selectedCategoryId,
  onSelectCategory,
}: CategoryGridProps) {
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'soup':
        return <Soup className="w-6 h-6" />;
      case 'tea':
        return <Coffee className="w-6 h-6" />;
      case 'chicken':
        return <Drumstick className="w-6 h-6" />;
      case 'sandwich':
        return <Sandwich className="w-6 h-6" />;
      case 'snack':
        return <Cookie className="w-6 h-6" />;
      case 'coffee':
        return <Coffee className="w-6 h-6" />;
      case 'rice':
        return <Flame className="w-6 h-6" />;
      case 'all':
      default:
        return <UtensilsCrossed className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
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

      {/* Grid of Categories */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 sm:gap-3">
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
            >
              {/* Icon Container with Badge */}
              <div
                className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center transition-all duration-150 border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-zinc-300 border-border group-hover:border-white/20 group-hover:text-foreground'
                }`}
              >
                {renderCategoryIcon(cat.iconName)}

                {cat.badge && !isSelected && (
                  <span className="absolute -top-1 -right-0.5 px-1 py-0.2 rounded bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                    {cat.badge}
                  </span>
                )}
              </div>

              {/* Title */}
              <span
                className={`text-xs font-medium transition-colors truncate max-w-full ${
                  isSelected ? 'text-primary' : 'text-zinc-400 group-hover:text-foreground'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
