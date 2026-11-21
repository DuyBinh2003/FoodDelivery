'use client';

import React, { useEffect, useState, useRef } from 'react';

export type SocketConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionStatusPillProps {
  status: SocketConnectionStatus;
  retryCount?: number;
  message?: string;
  className?: string;
}

export function ConnectionStatusPill({
  status,
  retryCount,
  message,
  className = '',
}: ConnectionStatusPillProps) {
  const [showReconnected, setShowReconnected] = useState(false);
  const prevStatusRef = useRef<SocketConnectionStatus>(status);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout | undefined;
    let showTimer: NodeJS.Timeout | undefined;

    if (prevStatusRef.current === 'reconnecting' && status === 'connected') {
      showTimer = setTimeout(() => {
        setShowReconnected(true);
        hideTimer = setTimeout(() => {
          setShowReconnected(false);
        }, 2000);
      }, 0);
    }

    prevStatusRef.current = status;

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [status]);

  if (status === 'connected' && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span>Đã kết nối lại hệ thống định vị</span>
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <span>
          {message || 'Đang kết nối lại hệ thống định vị...'}
          {retryCount && retryCount > 0 ? ` (Lần ${retryCount})` : ''}
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-rose-400"></span>
      <span>Mất kết nối với máy chủ định vị</span>
    </div>
  );
}

interface TraceIdBadgeProps {
  traceId?: string;
  className?: string;
}

export function TraceIdBadge({ traceId, className = '' }: TraceIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (!traceId) return null;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(traceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Bấm để sao chép mã sự cố"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors cursor-pointer ${className}`}
    >
      <span>Mã sự cố:</span>
      <span className="font-semibold text-zinc-300">{traceId}</span>
      <span className="text-[10px] text-zinc-500">{copied ? '✓ Đã chép' : '(Bấm chép)'}</span>
    </button>
  );
}
