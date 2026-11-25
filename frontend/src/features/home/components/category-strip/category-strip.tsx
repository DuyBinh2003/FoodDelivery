'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { useTranslations } from 'next-intl';
import type { CategoryStripProps } from './types';

interface CategoryPillDef {
  id: string;
  name: string;
  iconName: string;
  badge?: string;
}

const DEFAULT_CATEGORIES: CategoryPillDef[] = [
  { id: 'ALL', name: 'Tất cả', iconName: 'all' },
  { id: 'com', name: 'Cơm', iconName: 'rice' },
  { id: 'pho-bun', name: 'Phở & Bún', iconName: 'soup' },
  { id: 'tra-sua', name: 'Trà sữa', iconName: 'tea', badge: 'HOT' },
  { id: 'ga-ran', name: 'Gà rán', iconName: 'chicken' },
  { id: 'banh-mi', name: 'Bánh mì', iconName: 'sandwich' },
  { id: 'an-vat', name: 'Ăn vặt', iconName: 'snack' },
  { id: 'ca-phe', name: 'Cà phê', iconName: 'coffee' },
];

export function CategoryStrip({
  selectedCategoryId,
  onSelectCategory,
}: CategoryStripProps) {
  const tHome = useTranslations('home');
  const tCommon = useTranslations('common');

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'soup':
        return <Soup className="w-4 h-4" />;
      case 'tea':
      case 'coffee':
        return <Coffee className="w-4 h-4" />;
      case 'chicken':
        return <Drumstick className="w-4 h-4" />;
      case 'sandwich':
        return <Sandwich className="w-4 h-4" />;
      case 'snack':
        return <Cookie className="w-4 h-4" />;
      case 'rice':
        return <Flame className="w-4 h-4" />;
      case 'all':
      default:
        return <UtensilsCrossed className="w-4 h-4" />;
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
          {tHome('categoriesTitle')}
        </h2>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <span>{tCommon('viewAll')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal Scrollable Pill Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                isSelected
                  ? 'text-primary-foreground border-primary'
                  : 'bg-card text-foreground/85 border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="active-category-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/25 -z-0"
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                {renderIcon(cat.iconName)}
                <span>{cat.name}</span>
                {cat.badge && !isSelected && (
                  <span className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-extrabold uppercase">
                    {cat.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
