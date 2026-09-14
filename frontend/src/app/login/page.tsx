import type { Metadata } from 'next';
import LoginForm from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập | FoodDelivery',
  description: 'Đăng nhập vào hệ thống FoodDelivery để đặt món ăn giao tận nơi.',
};

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <LoginForm />
      </div>
    </main>
  );
}
