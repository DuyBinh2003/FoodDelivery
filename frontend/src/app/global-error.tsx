'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi" className="dark h-full">
      <body className="min-h-full flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
        <div className="w-full max-w-md text-center p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl">
          <div className="mx-auto mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Hệ thống gián đoạn
          </h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Ứng dụng gặp sự cố nghiêm trọng trong quá trình khởi tạo. Vui lòng thử
            tải lại toàn bộ ứng dụng.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-colors shadow-lg shadow-orange-600/30"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tải lại ứng dụng</span>
          </button>
        </div>
      </body>
    </html>
  );
}
