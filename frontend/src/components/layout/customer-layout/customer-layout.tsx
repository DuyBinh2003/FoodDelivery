'use client';

import React from 'react';
import { PageTransition } from '@/components/layout/page-transition/page-transition';

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition className="flex-1 flex flex-col w-full">
      {children}
    </PageTransition>
  );
}
