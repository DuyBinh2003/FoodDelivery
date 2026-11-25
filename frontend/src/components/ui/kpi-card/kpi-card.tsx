'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { KpiCardProps } from './types';

const TONE_ICON_STYLE = {
  primary: 'bg-primary/12 text-primary border-primary/20',
  info: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/20',
  warning: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20',
  danger: 'bg-destructive/12 text-destructive border-destructive/20',
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  tone = 'primary',
  loading = false,
  className,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-colors hover:border-primary/35',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
            TONE_ICON_STYLE[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="my-1 h-7 w-28 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-heading text-2xl font-extrabold tracking-tight text-foreground tabular-nums truncate">
              {value}
            </p>
            {trend && (
              <span className="text-xs font-semibold text-primary shrink-0">
                {trend}
              </span>
            )}
          </div>
        )}
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
