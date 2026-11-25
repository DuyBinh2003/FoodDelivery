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
    console.error('Route Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-background text-foreground">
      <div className="w-full max-w-lg relative z-10 text-center">
        <div className="mx-auto mb-6 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-destructive/12 border border-destructive/25 text-destructive">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground mb-3">
          Đã có sự cố ngoài ý muốn
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-8">
          Hệ thống gặp gián đoạn tạm thời khi tải nội dung này. Đừng lo lắng, dữ liệu đơn hàng và tài khoản của bạn luôn được bảo vệ an toàn.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button type="button" onClick={() => reset()} className="w-full sm:w-auto h-11 px-6 rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại trang</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl gap-2">
              <Home className="w-4 h-4" />
              <span>Quay về trang chủ</span>
            </Button>
          </Link>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link href="/menu" className="hover:text-primary transition-colors inline-flex items-center gap-1">
            <span>Khám phá thực đơn</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <span>•</span>
          <Link href="/history" className="hover:text-primary transition-colors inline-flex items-center gap-1">
            <span>Lịch sử đơn hàng</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground">
            <summary className="cursor-pointer font-mono font-medium text-destructive select-none">
              Chi tiết lỗi kỹ thuật (Development Only)
            </summary>
            <div className="mt-3 space-y-2 font-mono break-all">
              <p>
                <strong className="text-foreground">Message:</strong> {error.message || 'Unknown error'}
              </p>
              {error.digest && (
                <p>
                  <strong className="text-foreground">Digest:</strong> {error.digest}
                </p>
              )}
              {error.stack && (
                <pre className="p-2 bg-secondary rounded overflow-x-auto text-[11px] mt-2 whitespace-pre-wrap">
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
