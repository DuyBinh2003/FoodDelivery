'use client';

import React from 'react';

export function BannerSkeleton() {
  return (
    <div className="w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[28/8] max-h-72 rounded-3xl bg-zinc-900 border border-white/5 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent shimmer-animate" />
      <div className="absolute bottom-6 left-6 space-y-2">
        <div className="w-48 h-6 bg-white/10 rounded-lg" />
        <div className="w-72 h-4 bg-white/5 rounded-md" />
      </div>
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 border border-white/5" />
          <div className="w-12 h-3 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="w-64 sm:w-72 shrink-0 rounded-2xl bg-zinc-900/80 border border-white/5 p-3 space-y-3 animate-pulse">
      <div className="w-full h-36 rounded-xl bg-white/5" />
      <div className="space-y-1.5">
        <div className="w-3/4 h-4 bg-white/10 rounded" />
        <div className="w-1/2 h-3 bg-white/5 rounded" />
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className="w-16 h-3 bg-white/10 rounded" />
        <div className="w-16 h-3 bg-white/5 rounded" />
      </div>
    </div>
  );
}

export function RestaurantFeedSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <div className="w-40 h-6 bg-white/10 rounded animate-pulse" />
          <div className="w-20 h-4 bg-white/5 rounded animate-pulse" />
        </div>
      )}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function RestaurantGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-zinc-900/80 border border-white/5 p-3 space-y-3 animate-pulse">
          <div className="w-full h-40 rounded-xl bg-white/5" />
          <div className="space-y-1.5">
            <div className="w-3/4 h-4 bg-white/10 rounded" />
            <div className="w-1/2 h-3 bg-white/5 rounded" />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="w-16 h-3 bg-white/10 rounded" />
            <div className="w-20 h-3 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
