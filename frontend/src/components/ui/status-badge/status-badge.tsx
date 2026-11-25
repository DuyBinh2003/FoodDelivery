'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { resolveStatusConfig } from './status-badge.utils';
import type { StatusBadgeProps, StatusBadgeTone } from './types';

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  success:
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  warning:
    'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25',
  danger:
    'bg-destructive/12 text-destructive border-destructive/25',
  info:
    'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25',
  neutral:
    'bg-muted text-muted-foreground border-border',
};

const DOT_CLASSES: Record<StatusBadgeTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-destructive',
  info: 'bg-sky-500',
  neutral: 'bg-muted-foreground',
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = resolveStatusConfig(status, label);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors',
        TONE_CLASSES[config.tone],
        className,
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            DOT_CLASSES[config.tone],
            config.pulse && 'animate-pulse',
          )}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
