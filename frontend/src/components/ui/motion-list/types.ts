import type { ReactNode } from 'react';

export interface MotionListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export interface MotionListItemProps {
  children: ReactNode;
  className?: string;
}
