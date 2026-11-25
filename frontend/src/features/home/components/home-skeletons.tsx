'use client';

import React from 'react';

export function BannerSkeleton() {
  return (
    <div className="w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[28/8] max-h-72 rounded-2xl bg-card border border-border animate-pulse relative overflow-hidden">
      <div className="absolute bottom-5 left-5 space-y-2">
        <div className="w-48 h-5 bg-muted rounded-md" />
        <div className="w-64 h-3.5 bg-muted/70 rounded" />
      </div>
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="flex gap-2.5 overflow-hidden py-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-24 shrink-0 rounded-full bg-muted animate-pulse"
        />
      ))}
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="w-64 sm:w-72 shrink-0 rounded-2xl bg-card border border-border p-3 space-y-2.5 animate-pulse">
      <div className="w-full h-40 sm:h-44 rounded-xl bg-muted" />
      <div className="space-y-1.5">
        <div className="w-3/4 h-4 bg-muted rounded" />
        <div className="w-1/2 h-3 bg-muted/70 rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="w-14 h-3 bg-muted rounded" />
        <div className="w-16 h-4 bg-muted/70 rounded-full" />
      </div>
    </div>
  );
}

export function RestaurantFeedSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <div className="w-40 h-6 bg-muted rounded animate-pulse" />
          <div className="w-20 h-4 bg-muted/70 rounded animate-pulse" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-card border border-border p-3 space-y-2.5 animate-pulse"
        >
          <div className="w-full h-40 rounded-xl bg-muted" />
          <div className="space-y-1.5">
            <div className="w-3/4 h-4 bg-muted rounded" />
            <div className="w-1/2 h-3 bg-muted/70 rounded" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="w-14 h-3 bg-muted rounded" />
            <div className="w-16 h-4 bg-muted/70 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
