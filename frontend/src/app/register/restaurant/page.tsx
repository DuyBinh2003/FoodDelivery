import { RegisterRestaurantForm } from '@/features/restaurant/components/register-restaurant/register-restaurant';
import { Store } from 'lucide-react';
import Link from 'next/link';

export default function RestaurantRegisterPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-10 pb-20 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-primary/12 border border-primary/25 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Store className="w-8 h-8" />
            </div>

            <h1 className="font-heading text-3xl font-extrabold text-foreground mb-3">
              Đăng ký đối tác nhà hàng
            </h1>
            <p className="text-muted-foreground mb-8 text-base">
              Mở rộng cơ hội kinh doanh và tiếp cận hàng ngàn khách hàng tiềm năng cùng FoodDelivery.
            </p>

            <RegisterRestaurantForm />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Bằng việc gửi yêu cầu, bạn đồng ý với các{' '}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Điều khoản & Điều kiện
            </Link>{' '}
            của chúng tôi.
          </p>
        </div>
      </div>
    </div>
  );
}
