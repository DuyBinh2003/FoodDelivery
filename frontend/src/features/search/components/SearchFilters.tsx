import React from 'react';
import { SearchBar } from '@/features/search/components/SearchBar';
import { CategoryFilter, Category } from '@/features/search/components/CategoryFilter';
import { TagFilter, Tag } from '@/features/search/components/TagFilter';

interface SearchFiltersProps {
  categories?: Category[];
  tags?: Tag[];
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ categories = [], tags = [] }) => {
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Search Bar with Trending Chips */}
      <div className="w-full">
        <SearchBar />
      </div>

      {/* Horizontal Category Carousel */}
      {categories.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Danh mục món ngon
            </h3>
          </div>
          <CategoryFilter categories={categories} />
        </div>
      )}

      {/* Quick Tag Pills */}
      {tags.length > 0 && (
        <div className="w-full border-t border-white/5 pt-4">
          <TagFilter tags={tags} />
        </div>
      )}
    </div>
  );
};
