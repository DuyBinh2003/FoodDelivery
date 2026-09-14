'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {tags.map((tag) => {
        const isActive = activeTagId === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => handleSelect(tag.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
              isActive 
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/50' 
                : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 hover:border-zinc-500'
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};
