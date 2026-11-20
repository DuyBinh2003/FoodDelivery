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
  const activeTagId = searchParams.get('tag');
  const hasAnyFilter = Boolean(searchParams.get('tag') || searchParams.get('category') || searchParams.get('q'));

  const handleSelect = (tagId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Toggle off if already selected
    if (activeTagId === tagId) {
      params.delete('tag');
    } else {
      params.set('tag', tagId);
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    router.push('/menu', { scroll: false });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap pt-1">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 mr-1 shrink-0">
        <TagIcon className="w-3.5 h-3.5 text-zinc-500" />
        Lọc theo:
      </span>

      {tags.map((tag) => {
        const isActive = activeTagId === tag.id;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleSelect(tag.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none ${
              isActive 
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/50 shadow-xs' 
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/15'
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-400/90 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 hover:text-red-300 transition-colors ml-auto sm:ml-2"
        >
          <RotateCcw className="w-3 h-3" />
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
};
