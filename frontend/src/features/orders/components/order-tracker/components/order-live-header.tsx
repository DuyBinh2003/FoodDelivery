'use client';

import React, { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OrderLiveHeaderProps } from '../types';

export function OrderLiveHeader({
  orderId,
  isLive,
  isFetching,
  dataUpdatedAt,
  onRefresh,
}: OrderLiveHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Theo dõi đơn hàng
          </h1>
          {isLive ? (
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Realtime
            </Badge>
          ) : (
            <Badge variant="secondary">Đã kết thúc</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <span>Mã đơn:</span>
          <span className="font-mono text-foreground font-semibold">{orderId}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-secondary cursor-pointer"
            title="Sao chép mã đơn"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {formattedTime && (
          <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline-block">
            Cập nhật: {formattedTime}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="text-xs gap-1.5 h-8.5 px-3.5 rounded-full"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          {isFetching ? 'Đang cập nhật...' : 'Làm mới'}
        </Button>
      </div>
    </div>
  );
}
