'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log fatal route error
    console.error('Route Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-red-600/15 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated Warning Icon */}
        <div className="mx-auto mb-6 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900 border border-red-500/30 text-red-400 shadow-2xl shadow-red-500/20 ring-4 ring-red-500/10 animate-pulse">
          <AlertTriangle className="w-10 h-10" />
        </div>

        {/* Heading & Friendly Subtitle */}
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 mb-3 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Đã có sự cố ngoài ý muốn
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto mb-8">
          Hệ thống gặp gián đoạn tạm thời khi tải nội dung này. Đừng lo lắng, dữ
          liệu đơn hàng và tài khoản của bạn luôn được bảo vệ an toàn.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-medium shadow-lg shadow-orange-600/25 transition-all duration-200 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại trang</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all duration-200 gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Quay về trang chủ</span>
            </Button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-center gap-6 text-xs text-zinc-500">
          <Link
            href="/menu"
            className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
          >
            <span>Khám phá thực đơn</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <span>•</span>
          <Link
            href="/history"
            className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
          >
            <span>Lịch sử đơn hàng</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Developer Diagnostics (Shown only in Development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400">
            <summary className="cursor-pointer font-mono font-medium text-red-400 select-none">
              Chi tiết lỗi kỹ thuật (Development Only)
            </summary>
            <div className="mt-3 space-y-2 font-mono break-all">
              <p>
                <strong className="text-zinc-300">Message:</strong>{' '}
                {error.message || 'Unknown error'}
              </p>
              {error.digest && (
                <p>
                  <strong className="text-zinc-300">Digest:</strong>{' '}
                  {error.digest}
                </p>
              )}
              {error.stack && (
                <pre className="p-2 bg-zinc-900 rounded overflow-x-auto text-[11px] text-zinc-500 mt-2 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
