import Link from 'next/link';
import { UtensilsCrossed, Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-orange-600/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated Badge */}
        <div className="mx-auto mb-6 inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-zinc-900 border border-orange-500/20 text-orange-400 shadow-2xl shadow-orange-500/15 ring-4 ring-orange-500/5">
          <UtensilsCrossed className="w-12 h-12" />
        </div>

        {/* 404 Code Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <span>Lỗi 404</span>
          <span>•</span>
          <span>Trang không tồn tại</span>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Món ngon này đang ở một nơi khác!
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8">
          Trang bạn đang tìm kiếm không tồn tại, đã đổi địa chỉ hoặc nhà hàng đã
          ngừng phục vụ món này.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/menu" className="w-full sm:w-auto">
            <Button
              type="button"
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium shadow-lg shadow-orange-500/25 gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Khám phá thực đơn</span>
            </Button>
          </Link>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 hover:text-white gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </Button>
          </Link>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang trước</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
