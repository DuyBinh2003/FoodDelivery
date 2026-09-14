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
      <div className="w-full">
        <SearchBar />
      </div>

      {categories.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 px-1">Danh mục</h3>
          <CategoryFilter categories={categories} />
        </div>
      )}

      {tags.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 px-1">Lọc nhanh</h3>
          <TagFilter tags={tags} />
        </div>
      )}
    </div>
  );
};
