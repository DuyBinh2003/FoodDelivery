'use client';

import React, { useEffect, useState } from 'react';
import { Search, X, Flame } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';

const TRENDING_KEYWORDS = [
  'Cơm tấm',
  'Trà sữa',
  'Bún đậu',
  'Gà rán',
  'Cà phê muối',
  'Pizza',
] as const;

export const SearchBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const searchParamQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(searchParamQuery);
  const [prevSearchParamQuery, setPrevSearchParamQuery] = useState(searchParamQuery);

  if (searchParamQuery !== prevSearchParamQuery) {
    setPrevSearchParamQuery(searchParamQuery);
    setQuery(searchParamQuery);
  }

  const debouncedQuery = useDebounce(query, 400);

  // When debounced query changes, update the URL
  useEffect(() => {
    if (debouncedQuery !== (searchParams.get('q') || '')) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery) {
        params.set('q', debouncedQuery);
      } else {
        params.delete('q');
      }
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [debouncedQuery, router, searchParams]);

  const handleChipClick = (keyword: string) => {
    setQuery(keyword);
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', keyword);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleClear = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      {/* Search Input Container */}
      <div className="relative w-full group">
        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-orange-500 transition-colors duration-200" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm món ngon, tên quán, hương vị yêu thích..."
          className="w-full pl-12 pr-11 py-3.5 bg-zinc-900/80 border border-white/10 text-white rounded-2xl placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/60 shadow-xl shadow-black/20 backdrop-blur-md text-sm sm:text-base transition-all duration-300"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 rounded-full bg-white/10 p-0.5 hover:bg-white/20" />
          </button>
        )}
      </div>

      {/* Trending Search Chips */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs text-zinc-400 pt-0.5">
        <span className="flex items-center gap-1 font-medium text-orange-400/90 shrink-0 mr-1">
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          Gợi ý hot:
        </span>
        {TRENDING_KEYWORDS.map((keyword) => {
          const isSelected = query.toLowerCase() === keyword.toLowerCase();
          return (
            <button
              key={keyword}
              type="button"
              onClick={() => handleChipClick(keyword)}
              className={`px-2.5 py-1 rounded-full border transition-all duration-200 ${
                isSelected
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-xs'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/15'
              }`}
            >
              {keyword}
            </button>
          );
        })}
      </div>
    </div>
  );
};
