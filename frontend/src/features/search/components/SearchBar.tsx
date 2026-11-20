'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Flame,
  Clock,
  Loader2,
  Utensils,
  Store,
  ArrowUpRight,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchSuggestions } from '@/features/search/hooks/use-search';
import { useSearchHistory } from '@/features/search/hooks/use-search-history';
import type { SearchSuggestionDish, SearchSuggestionRestaurant } from '@/features/search/types';

const TRENDING_KEYWORDS = [
  'Cơm tấm',
  'Trà sữa',
  'Bún bò',
  'Phở bò',
  'Gà rán',
  'Cà phê muối',
] as const;

export const SearchBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchParamQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(searchParamQuery);
  const [prevSearchParamQuery, setPrevSearchParamQuery] = useState(searchParamQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Đồng bộ search param URL
  if (searchParamQuery !== prevSearchParamQuery) {
    setPrevSearchParamQuery(searchParamQuery);
    setQuery(searchParamQuery);
  }

  // Hook quản lý lịch sử tìm kiếm từ localStorage
  const { history, addHistory, removeHistory, clearHistory, isLoaded: isHistoryLoaded } = useSearchHistory();

  // Debounce 300ms cho tìm kiếm
  const debouncedQuery = useDebounce(query, 300);

  // Trạng thái Loading 2 tầng:
  // Tầng 1: isDebouncing (đang gõ phím)
  // Tầng 2: isFetching (đang tải API)
  const isDebouncing = query.trim() !== debouncedQuery.trim() && query.trim().length > 0;

  // Lắng nghe gợi ý tự động qua API
  const {
    data: suggestions,
    isLoading: isLoadingSuggestions,
    isFetching: isFetchingSuggestions,
  } = useSearchSuggestions(debouncedQuery);

  const isSearching = isDebouncing || (isFetchingSuggestions && debouncedQuery.trim().length >= 2);

  // Khi debounced query thay đổi và người dùng đã dừng gõ
  useEffect(() => {
    const currentUrlQ = searchParams.get('q') || '';
    if (debouncedQuery.trim() !== currentUrlQ) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery.trim()) {
        params.set('q', debouncedQuery.trim());
      } else {
        params.delete('q');
      }
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [debouncedQuery, router, searchParams]);

  // Click-outside listener để đóng popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Áp dụng từ khóa và cập nhật lịch sử
  const applyKeyword = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      setQuery(trimmed);
      if (trimmed) {
        addHistory(trimmed);
      }
      setIsFocused(false);
      setSelectedIndex(-1);
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [addHistory, router, searchParams],
  );

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      applyKeyword(query);
    }
  };

  // Keyboard navigation cho suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
      return;
    }

    const flatList: string[] = [
      ...(suggestions?.dishes?.map((d) => d.name) || []),
      ...(suggestions?.restaurants?.map((r) => r.name) || []),
      ...(suggestions?.keywords || []),
    ];

    if (flatList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatList.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < flatList.length) {
      e.preventDefault();
      applyKeyword(flatList[selectedIndex]);
    }
  };

  const showSuggestions = isFocused && query.trim().length >= 2;
  const showHistory = isFocused && query.trim().length < 2 && isHistoryLoaded && history.length > 0;
  const isComboboxExpanded = showSuggestions || showHistory;

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto flex flex-col gap-3 relative">
      {/* Search Input Container */}
      <form onSubmit={handleSubmit} className="relative w-full group">
        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
          <Search
            className={`h-5 w-5 transition-colors duration-200 ${
              isFocused ? 'text-orange-500' : 'text-zinc-400 group-focus-within:text-orange-500'
            }`}
          />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm món ngon, tên quán, hương vị yêu thích..."
          className="w-full pl-12 pr-12 py-3.5 bg-zinc-900/85 border border-white/10 text-white rounded-2xl placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/60 shadow-xl shadow-black/25 backdrop-blur-md text-sm sm:text-base transition-all duration-300"
          aria-label="Tìm kiếm món ăn và nhà hàng"
          role="combobox"
          aria-expanded={isComboboxExpanded}
          aria-controls="search-suggestions-popover"
        />

        {/* Action icons (Loading Spinner / Clear Button) */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-1.5">
          {isSearching && (
            <Loader2
              className="h-4.5 w-4.5 text-orange-400 animate-spin"
              data-testid="search-loading-spinner"
            />
          )}

          {query && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="h-4 w-4 rounded-full bg-white/10 p-0.5 hover:bg-white/20" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown Popover: Search History & Autocomplete Suggestions */}
      {isComboboxExpanded && (
        <div
          id="search-suggestions-popover"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden divide-y divide-white/5 animate-in fade-in slide-in-from-top-2 duration-200"
          role="listbox"
        >
          {/* 1. Lịch sử tìm kiếm (Khi query rỗng hoặc < 2 ký tự) */}
          {showHistory && (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 py-1 mb-1 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  Tìm kiếm gần đây
                </span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-zinc-500 hover:text-red-400 transition-colors text-xs"
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                {history.map((item) => (
                  <div
                    key={item}
                    onClick={() => applyKeyword(item)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Clock className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-orange-400 transition-colors" />
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistory(item);
                      }}
                      className="text-zinc-500 hover:text-zinc-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Xóa ${item} khỏi lịch sử`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Autocomplete Suggestions (Khi query >= 2 ký tự) */}
          {showSuggestions && (
            <div className="p-3 max-h-96 overflow-y-auto divide-y divide-white/5">
              {/* Skeleton loading khi đang tải gợi ý */}
              {isLoadingSuggestions && (
                <div className="py-2 flex flex-col gap-2">
                  <div className="h-4 bg-white/5 rounded-md animate-pulse w-3/4 mx-2" />
                  <div className="h-4 bg-white/5 rounded-md animate-pulse w-1/2 mx-2" />
                  <div className="h-4 bg-white/5 rounded-md animate-pulse w-2/3 mx-2" />
                </div>
              )}

              {/* Nhóm Món ăn (Dishes) */}
              {suggestions?.dishes && suggestions.dishes.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-amber-400" />
                    Món ăn
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {suggestions.dishes.map((dish: SearchSuggestionDish) => (
                      <div
                        key={dish.id}
                        onClick={() => applyKeyword(dish.name)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-zinc-200 hover:bg-orange-500/10 hover:text-orange-300 cursor-pointer transition-colors group"
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-medium truncate text-white group-hover:text-orange-300">
                            {dish.name}
                          </span>
                          <span className="text-xs text-zinc-500 truncate">
                            {dish.restaurant_name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-orange-400 shrink-0">
                          {Number(dish.price).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhóm Nhà hàng (Restaurants) */}
              {suggestions?.restaurants && suggestions.restaurants.length > 0 && (
                <div className="py-2">
                  <div className="px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    Quán ăn
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {suggestions.restaurants.map((rest: SearchSuggestionRestaurant) => (
                      <div
                        key={rest.id}
                        onClick={() => applyKeyword(rest.name)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-zinc-200 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Store className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-emerald-400" />
                          <span className="font-medium truncate text-white group-hover:text-emerald-300">
                            {rest.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
                          {rest.distance_km !== undefined && (
                            <span>{rest.distance_km} km</span>
                          )}
                          <span className="text-amber-400 font-semibold">
                            ★ {rest.rating}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhóm Từ khóa liên quan (Keywords) */}
              {suggestions?.keywords && suggestions.keywords.length > 0 && (
                <div className="py-2 last:pb-0">
                  <div className="px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-orange-400" />
                    Từ khóa gợi ý
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {suggestions.keywords.map((kw: string) => (
                      <div
                        key={kw}
                        onClick={() => applyKeyword(kw)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors group"
                      >
                        <span className="truncate">{kw}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State cho suggestions */}
              {!isLoadingSuggestions &&
                (!suggestions?.keywords.length &&
                  !suggestions?.dishes.length &&
                  !suggestions?.restaurants.length) && (
                  <div className="py-6 text-center text-xs text-zinc-500">
                    Không tìm thấy món ăn hoặc quán phù hợp với &quot;{query}&quot;
                  </div>
                )}
            </div>
          )}
        </div>
      )}

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
              onClick={() => applyKeyword(keyword)}
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
