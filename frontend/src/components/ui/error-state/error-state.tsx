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
        'relative overflow-hidden rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-8 text-center flex flex-col items-center justify-center my-4 shadow-xl',
        className,
      )}
    >
      {/* Background ambient red glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Warning Icon Badge */}
      <div className="relative mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-red-500/20 to-red-600/10 border border-red-500/30 text-red-400 shadow-lg shadow-red-500/10">
        <AlertCircle className="w-7 h-7" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-zinc-100 tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-medium shadow-md shadow-red-600/20 gap-2 px-4 h-9"
          >
            <RefreshCw
              className={cn('w-4 h-4', isRetrying && 'animate-spin')}
            />
            <span>{retryText}</span>
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
