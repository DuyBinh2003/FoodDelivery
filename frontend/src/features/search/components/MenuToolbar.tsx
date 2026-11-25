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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 bg-card rounded-2xl border border-border shadow-xs mb-8">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <div className="w-9 h-9 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Utensils className="w-4 h-4" />
        </div>
        <div>
          Tìm thấy <span className="font-bold text-foreground text-base">{totalItems}</span> món ăn từ{' '}
          <span className="font-bold text-primary">{totalRestaurants}</span> quán ăn
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end sm:self-auto text-xs sm:text-sm">
        <label htmlFor="sort-select" className="text-muted-foreground flex items-center gap-1.5 shrink-0 font-medium">
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sắp xếp:
        </label>
        <div className="relative">
          <select
            id="sort-select"
            value={currentSort}
            onChange={handleSortChange}
            aria-label="Sắp xếp thực đơn"
            className="appearance-none bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-colors text-xs sm:text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
            <ArrowDownAZ className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
