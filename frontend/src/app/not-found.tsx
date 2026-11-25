import Link from 'next/link';
import { UtensilsCrossed, Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 relative overflow-hidden bg-background text-foreground">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 text-center">
        <div className="mx-auto mb-6 inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-card border border-primary/25 text-primary shadow-md">
          <UtensilsCrossed className="w-12 h-12" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/12 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider mb-4">
          <span>Lỗi 404</span>
          <span>•</span>
          <span>Trang không tồn tại</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Món ngon này đang ở một nơi khác!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8">
          Trang bạn đang tìm kiếm không tồn tại, đã đổi địa chỉ hoặc nhà hàng đã ngừng phục vụ món này.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/menu" className="w-full sm:w-auto">
            <Button type="button" className="w-full sm:w-auto h-11 px-6 rounded-xl gap-2">
              <Search className="w-4 h-4" />
              <span>Khám phá thực đơn</span>
            </Button>
          </Link>

          <Link href="/" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl gap-2">
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
