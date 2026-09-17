'use client';

import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';

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

  const debouncedQuery = useDebounce(query, 500);

  // When debounced query changes, update the URL
  useEffect(() => {
    // Only update if it's different from current URL to prevent infinite loops
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

  return (
    <div className="relative w-full max-w-xl group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm kiếm nhà hàng, món ăn..."
        className="w-full pl-11 pr-10 py-3.5 bg-zinc-900/50 border border-white/10 text-white rounded-2xl placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 backdrop-blur-sm"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
