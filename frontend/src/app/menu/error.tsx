'use client';

import { useEffect } from 'react';

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('MenuPage Error:', error);
  }, [error]);

  return (
    <div className="flex-1 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center py-20 min-h-[50vh]">
      <div className="text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl max-w-md w-full">
        <div className="text-red-500 mb-4">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Đã có lỗi xảy ra!</h2>
        <p className="text-zinc-400 mb-6">
          Không thể kết nối đến máy chủ để tải dữ liệu. Vui lòng thử lại.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
