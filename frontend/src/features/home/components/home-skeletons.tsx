'use client';

import React from 'react';

export function BannerSkeleton() {
  return (
    <div className="w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[28/8] max-h-72 rounded-xl bg-card border border-border animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      <div className="absolute bottom-5 left-5 space-y-2">
        <div className="w-48 h-5 bg-white/10 rounded-md" />
        <div className="w-64 h-3.5 bg-white/5 rounded" />
      </div>
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 sm:gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-card border border-border" />
          <div className="w-10 h-3 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="w-60 sm:w-68 shrink-0 rounded-xl bg-card border border-border p-3 space-y-2.5 animate-pulse">
      <div className="w-full h-34 sm:h-38 rounded-lg bg-white/5" />
      <div className="space-y-1">
        <div className="w-3/4 h-3.5 bg-white/10 rounded" />
        <div className="w-1/2 h-2.5 bg-white/5 rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="w-14 h-2.5 bg-white/10 rounded" />
        <div className="w-14 h-2.5 bg-white/5 rounded" />
      </div>
    </div>
  );
}

export function RestaurantFeedSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <div className="w-36 h-5 bg-white/10 rounded animate-pulse" />
          <div className="w-16 h-3.5 bg-white/5 rounded animate-pulse" />
        </div>
      )}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function RestaurantGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border p-3 space-y-2.5 animate-pulse">
          <div className="w-full h-36 rounded-lg bg-white/5" />
          <div className="space-y-1">
            <div className="w-3/4 h-3.5 bg-white/10 rounded" />
            <div className="w-1/2 h-2.5 bg-white/5 rounded" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="w-14 h-2.5 bg-white/10 rounded" />
            <div className="w-16 h-2.5 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
