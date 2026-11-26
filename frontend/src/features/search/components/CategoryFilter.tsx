'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { resolveCategoryMatch } from '@/features/search/utils/menu-catalog.utils';

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryFilterProps {
  categories: Category[];
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategoryParam = searchParams.get('category');

  const handleSelect = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    const isCurrentlySelected = categoryId
      ? resolveCategoryMatch(
          activeCategoryParam,
          categories.find((c) => c.id === categoryId) ?? { id: categoryId, name: '' },
        )
      : false;

    if (!categoryId || isCurrentlySelected) {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }

    const qs = params.toString();
    router.push(qs ? `?${qs}` : '/menu', { scroll: false });
  };

  const isAllActive = !activeCategoryParam;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={`group flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 shrink-0 select-none cursor-pointer ${
            isAllActive
              ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-sm shadow-primary/20'
              : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-primary/35'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-xs sm:text-sm whitespace-nowrap">Tất cả món</span>
        </button>

        {categories.map((cat) => {
          const isActive = resolveCategoryMatch(activeCategoryParam, cat);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.id)}
              className={`group flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 shrink-0 select-none cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-sm shadow-primary/20'
                  : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-primary/35'
              }`}
            >
              <span className="text-sm">{cat.icon || '🍜'}</span>
              <span className="text-xs sm:text-sm whitespace-nowrap">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
