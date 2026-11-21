'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

export interface CircuitBreakerDegradationBannerProps {
  isFallback?: boolean;
  circuitStatus?: 'OPEN' | 'HALF_OPEN' | 'CLOSED' | string;
  onRetry?: () => Promise<void> | void;
}

export function CircuitBreakerDegradationBanner({
  isFallback = false,
  circuitStatus = 'CLOSED',
  onRetry,
}: CircuitBreakerDegradationBannerProps) {
  const [retrying, setRetrying] = useState(false);
  const [retriedSuccess, setRetriedSuccess] = useState(false);

  // Chỉ hiển thị khi đang ở chế độ Fallback hoặc Circuit Breaker đang OPEN
  if (!isFallback && circuitStatus !== 'OPEN') {
    return null;
  }

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    try {
      setRetrying(true);
      await onRetry();
      setRetriedSuccess(true);
      setTimeout(() => setRetriedSuccess(false), 2000);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-blue-950/50 to-indigo-950/60 border border-cyan-500/30 shadow-lg text-cyan-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white">
              Hệ thống tìm kiếm tức thời đang được tối ưu
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Gợi ý phổ biến
            </span>
          </div>
          <p className="text-xs text-cyan-300/80 mt-0.5">
            Dữ liệu đang được phân phối từ bộ đệm cao tốc. Đang gợi ý các món ăn & quán ngon được yêu thích nhất gần bạn.
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-200 hover:text-white transition-all flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center"
        >
          {retrying ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang thử lại...</span>
            </>
          ) : retriedSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đã làm mới</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử kết nối lại</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
