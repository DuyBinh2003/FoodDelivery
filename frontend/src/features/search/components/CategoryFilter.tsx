'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';

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

  const handleSelect = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (!categoryId || activeCategoryId === categoryId) {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const isAllActive = !activeCategoryId;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        {/* Nút "Tất cả" */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-300 shrink-0 select-none ${
            isAllActive
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold border-orange-400/30 shadow-lg shadow-orange-500/25 scale-[1.02]'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/15 hover:bg-zinc-800/60'
          }`}
        >
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
            isAllActive ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
          }`}>
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">Tất cả món</span>
        </button>

        {/* Danh sách categories từ backend */}
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.id)}
              className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-300 shrink-0 select-none ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold border-orange-400/30 shadow-lg shadow-orange-500/25 scale-[1.02]' 
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/15 hover:bg-zinc-800/60'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-base transition-colors ${
                isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                {cat.icon || '🍜'}
              </div>
              <span className="text-sm font-medium whitespace-nowrap">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
