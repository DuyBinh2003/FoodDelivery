'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const activeCategoryId = searchParams.get('category');

  const handleSelect = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Toggle off if already selected
    if (activeCategoryId === categoryId) {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full overflow-x-auto pb-4 no-scrollbar">
      <div className="flex gap-4">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={`flex flex-col items-center justify-center min-w-[80px] p-3 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 scale-105' 
                  : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-white/5'
              }`}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-2 text-2xl bg-white/10 rounded-full">
                {cat.icon || '🍽️'}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
