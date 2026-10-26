'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownAZ, ArrowUpDown, Utensils } from 'lucide-react';

interface MenuToolbarProps {
  totalItems: number;
  totalRestaurants: number;
}

const SORT_OPTIONS = [
  { value: 'default', label: 'Phổ biến nhất' },
  { value: 'price_asc', label: 'Giá: Thấp đến cao' },
  { value: 'price_desc', label: 'Giá: Cao đến thấp' },
  { value: 'name_asc', label: 'Tên món: A - Z' },
] as const;

export const MenuToolbar: React.FC<MenuToolbarProps> = ({ totalItems, totalRestaurants }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'default';

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === 'default') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 bg-zinc-900/40 rounded-2xl border border-white/5 backdrop-blur-md mb-8">
      {/* Result Counter */}
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
          <Utensils className="w-4 h-4" />
        </div>
        <div>
          Tìm thấy <span className="font-bold text-white text-base">{totalItems}</span> món ăn từ{' '}
          <span className="font-bold text-orange-400">{totalRestaurants}</span> quán ăn
        </div>
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto text-xs sm:text-sm">
        <label htmlFor="sort-select" className="text-zinc-400 flex items-center gap-1.5 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
          Sắp xếp:
        </label>
        <div className="relative">
          <select
            id="sort-select"
            value={currentSort}
            onChange={handleSortChange}
            aria-label="Sắp xếp thực đơn"
            className="appearance-none bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 text-white rounded-xl px-3.5 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer transition-colors text-xs sm:text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
            <ArrowDownAZ className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
