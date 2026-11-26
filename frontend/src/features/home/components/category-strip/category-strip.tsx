'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
import { useTranslations } from 'next-intl';
import type { CategoryStripProps } from '@/features/home/components/category-strip/types';
import type { HomeCategoryItem } from '@/features/home/utils/home-feed.utils';

function renderCategoryIcon(category: HomeCategoryItem) {
  if (category.id === 'ALL') {
    return <UtensilsCrossed className="w-4 h-4" />;
  }
  if (category.icon_url && category.icon_url.startsWith('http')) {
    return (
      <Image
        src={category.icon_url}
        alt={category.name}
        width={18}
        height={18}
        unoptimized
        className="w-4 h-4 rounded-full object-cover"
      />
    );
  }
  const lower = category.name.toLowerCase();
  if (lower.includes('phở') || lower.includes('bún')) return <Soup className="w-4 h-4" />;
  if (lower.includes('trà') || lower.includes('cà phê') || lower.includes('giải khát')) {
    return <Coffee className="w-4 h-4" />;
  }
  if (lower.includes('gà') || lower.includes('burger')) return <Drumstick className="w-4 h-4" />;
  if (lower.includes('bánh mì')) return <Sandwich className="w-4 h-4" />;
  if (lower.includes('pizza') || lower.includes('mì ý')) return <Pizza className="w-4 h-4" />;
  if (lower.includes('chay')) return <Leaf className="w-4 h-4" />;
  if (lower.includes('cơm')) return <Flame className="w-4 h-4" />;
  if (lower.includes('vặt') || lower.includes('bánh')) return <Cookie className="w-4 h-4" />;
  return <UtensilsCrossed className="w-4 h-4" />;
}

export function CategoryStrip({
  selectedCategoryId,
  onSelectCategory,
  categories = [],
}: CategoryStripProps) {
  const tHome = useTranslations('home');
  const tCommon = useTranslations('common');

  const stripItems: HomeCategoryItem[] = [{ id: 'ALL', name: 'Tất cả' }, ...categories];

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

      {/* Horizontal Scrollable Pill Strip synced with real DB categories */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {stripItems.map((cat) => {
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
                {renderCategoryIcon(cat)}
                <span>{cat.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
