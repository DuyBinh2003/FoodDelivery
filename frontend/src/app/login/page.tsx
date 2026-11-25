import type { Metadata } from 'next';
import Image from 'next/image';
import { ShieldCheck, Clock, MapPin } from 'lucide-react';
import LoginForm from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập | FoodDelivery',
  description: 'Đăng nhập vào hệ thống FoodDelivery để đặt món ăn giao tận nơi.',
};

export default function LoginPage() {
  return (
    <main className="flex-1 bg-background text-foreground flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left: Login Form */}
        <div className="lg:col-span-6 w-full">
          <LoginForm />
        </div>

        {/* Right: Brand Showcase (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl border border-border bg-gradient-to-br from-emerald-50 via-card to-lime-50/70 dark:from-emerald-950/40 dark:via-card dark:to-background p-8 shadow-sm space-y-6">
          <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-border bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85"
              alt="Fresh meal preparation"
              fill
              priority
              sizes="45vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="inline-block px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold mb-1.5">
                FoodDelivery Express
              </span>
              <p className="font-heading text-lg font-extrabold leading-snug">
                Đặt món tươi ngon mỗi ngày, theo dõi tài xế trực tiếp trên bản đồ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Giao nhanh 20 phút</p>
                <p className="text-[11px] text-muted-foreground">Điều phối tài xế tự động trong bán kính gần nhất</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Định vị GPS & OSRM chuẩn xác</p>
                <p className="text-[11px] text-muted-foreground">Theo dõi từng ngã rẽ của tài xế theo thời gian thực</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Thanh toán an toàn & Sổ cái kép</p>
                <p className="text-[11px] text-muted-foreground">Hỗ trợ Ví FoodPay, VNPAY, MoMo và tiền mặt</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
