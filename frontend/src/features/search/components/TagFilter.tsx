'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RotateCcw, Tag as TagIcon } from 'lucide-react';

export interface Tag {
  id: string;
  name: string;
}

interface TagFilterProps {
  tags: Tag[];
}

export const TagFilter: React.FC<TagFilterProps> = ({ tags }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTagParam = searchParams.get('tag');
  const hasAnyFilter = Boolean(
    searchParams.get('tag') ||
      searchParams.get('category') ||
      searchParams.get('q') ||
      searchParams.get('promo'),
  );

  const handleSelect = (tagId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (activeTagParam === tagId) {
      params.delete('tag');
    } else {
      params.set('tag', tagId);
    }

    const qs = params.toString();
    router.push(qs ? `?${qs}` : '/menu', { scroll: false });
  };

  const handleResetFilters = () => {
    router.push('/menu', { scroll: false });
  };

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1 shrink-0">
        <TagIcon className="w-3.5 h-3.5" />
        Lọc theo:
      </span>

      {tags.map((tag) => {
        const isActive =
          activeTagParam === tag.id ||
          (activeTagParam !== null &&
            activeTagParam.trim().toLowerCase() === tag.name.trim().toLowerCase());
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleSelect(tag.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer ${
              isActive
                ? 'bg-primary text-primary-foreground border border-primary shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border hover:border-primary/40'
            }`}
          >
            {tag.name}
          </button>
        );
      })}

      {hasAnyFilter && (
        <button
          type="button"
          onClick={handleResetFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/25 hover:bg-destructive/15 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
};
