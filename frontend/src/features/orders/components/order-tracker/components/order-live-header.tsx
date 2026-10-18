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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Theo dõi đơn hàng
          </h1>
          {isLive ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Realtime
            </Badge>
          ) : (
            <Badge variant="outline" className="text-zinc-400 border-white/10 bg-white/5 text-xs">
              Đã kết thúc
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
          <span>Mã đơn:</span>
          <span className="font-mono text-zinc-200 font-semibold">{orderId}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
            title="Sao chép mã đơn"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {formattedTime && (
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline-block">
            Cập nhật: {formattedTime}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 text-xs gap-1.5 h-8 px-3 rounded-full"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-orange-400' : ''}`} />
          {isFetching ? 'Đang cập nhật...' : 'Làm mới'}
        </Button>
      </div>
    </div>
  );
}
