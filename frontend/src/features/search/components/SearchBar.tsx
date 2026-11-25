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

  if (searchParamQuery !== prevSearchParamQuery) {
    setPrevSearchParamQuery(searchParamQuery);
    setQuery(searchParamQuery);
  }

  const { history, addHistory, removeHistory, clearHistory, isLoaded: isHistoryLoaded } = useSearchHistory();
  const debouncedQuery = useDebounce(query, 300);

  const isDebouncing = query.trim() !== debouncedQuery.trim() && query.trim().length > 0;

  const {
    data: suggestions,
    isLoading: isLoadingSuggestions,
    isFetching: isFetchingSuggestions,
  } = useSearchSuggestions(debouncedQuery);

  const isSearching = isDebouncing || (isFetchingSuggestions && debouncedQuery.trim().length >= 2);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <form onSubmit={handleSubmit} className="relative w-full group">
        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
          <Search
            className={`h-5 w-5 transition-colors duration-200 ${
              isFocused ? 'text-primary' : 'text-muted-foreground group-focus-within:text-primary'
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
          className="w-full pl-12 pr-12 py-3.5 bg-card border border-border text-foreground rounded-2xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-md text-sm sm:text-base transition-all duration-200"
          aria-label="Tìm kiếm món ăn và nhà hàng"
          role="combobox"
          aria-expanded={isComboboxExpanded}
          aria-controls="search-suggestions-popover"
        />

        <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-1.5">
          {isSearching && (
            <Loader2
              className="h-4.5 w-4.5 text-primary animate-spin"
              data-testid="search-loading-spinner"
            />
          )}

          {query && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="h-4 w-4 rounded-full bg-secondary p-0.5 hover:bg-muted" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown Popover */}
      {isComboboxExpanded && (
        <div
          id="search-suggestions-popover"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl overflow-hidden divide-y divide-border animate-in text-left"
          role="listbox"
        >
          {showHistory && (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 py-1 mb-1 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Tìm kiếm gần đây
                </span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-muted-foreground hover:text-destructive transition-colors text-xs cursor-pointer"
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                {history.map((item) => (
                  <div
                    key={item}
                    onClick={() => applyKeyword(item)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistory(item);
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label={`Xóa ${item} khỏi lịch sử`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSuggestions && (
            <div className="p-3 max-h-96 overflow-y-auto divide-y divide-border">
              {isLoadingSuggestions && (
                <div className="py-2 flex flex-col gap-2">
                  <div className="h-4 bg-muted rounded-md animate-pulse w-3/4 mx-2" />
                  <div className="h-4 bg-muted rounded-md animate-pulse w-1/2 mx-2" />
                  <div className="h-4 bg-muted rounded-md animate-pulse w-2/3 mx-2" />
                </div>
              )}

              {suggestions?.dishes && suggestions.dishes.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-primary" />
                    Món ăn
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {suggestions.dishes.map((dish: SearchSuggestionDish) => (
                      <div
                        key={dish.id}
                        onClick={() => applyKeyword(dish.name)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors group"
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-medium truncate">{dish.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {dish.restaurant_name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary shrink-0">
                          {Number(dish.price).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {suggestions?.restaurants && suggestions.restaurants.length > 0 && (
                <div className="py-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    Quán ăn
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {suggestions.restaurants.map((rest: SearchSuggestionRestaurant) => (
                      <div
                        key={rest.id}
                        onClick={() => applyKeyword(rest.name)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Store className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary" />
                          <span className="font-medium truncate">{rest.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {rest.distance_km !== undefined && <span>{rest.distance_km} km</span>}
                          <span className="text-amber-500 font-bold">★ {rest.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {suggestions?.keywords && suggestions.keywords.length > 0 && (
                <div className="py-2 last:pb-0">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    Từ khóa gợi ý
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {suggestions.keywords.map((kw: string) => (
                      <div
                        key={kw}
                        onClick={() => applyKeyword(kw)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors group"
                      >
                        <span className="truncate">{kw}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isLoadingSuggestions &&
                !suggestions?.keywords.length &&
                !suggestions?.dishes.length &&
                !suggestions?.restaurants.length && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Không tìm thấy món ăn hoặc quán phù hợp với &quot;{query}&quot;
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Trending Search Chips */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs text-muted-foreground pt-0.5">
        <span className="flex items-center gap-1 font-semibold text-primary shrink-0 mr-1">
          <Flame className="w-3.5 h-3.5" />
          Gợi ý hot:
        </span>
        {TRENDING_KEYWORDS.map((keyword) => {
          const isSelected = query.toLowerCase() === keyword.toLowerCase();
          return (
            <button
              key={keyword}
              type="button"
              onClick={() => applyKeyword(keyword)}
              className={`px-3 py-1 rounded-full border font-medium transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-foreground/80 hover:text-primary border-border hover:border-primary/40'
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
