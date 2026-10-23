'use client';

import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ErrorStateProps } from './types';

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  description = 'Đã có sự cố xảy ra khi kết nối đến máy chủ. Vui lòng thử lại sau ít phút.',
  onRetry,
  retryText = 'Thử lại',
  action,
  className,
  compact = false,
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    try {
      setIsRetrying(true);
      await Promise.resolve(onRetry());
    } finally {
      setIsRetrying(false);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-zinc-200 text-sm',
          className,
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="truncate text-xs font-medium text-zinc-300">
            {description}
          </span>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleRetry}
            disabled={isRetrying}
            className="shrink-0 border-red-800/40 hover:bg-red-900/30 text-red-300 text-xs gap-1"
          >
            <RefreshCw
              className={cn('w-3 h-3', isRetrying && 'animate-spin')}
            />
            {retryText}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-card border border-border p-8 text-center flex flex-col items-center justify-center my-4',
        className,
      )}
    >
      {/* Warning Icon Badge */}
      <div className="relative mb-3.5 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-destructive/15 border border-destructive/25 text-destructive">
        <AlertCircle className="w-5 h-5" />
      </div>

      {/* Content */}
      <h3 className="text-base font-medium text-foreground tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {onRetry && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="gap-2 px-3.5"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')}
            />
            <span>{retryText}</span>
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
