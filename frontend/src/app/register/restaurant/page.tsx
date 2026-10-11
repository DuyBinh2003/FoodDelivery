import { RegisterRestaurantForm } from '@/features/restaurant/components/register-restaurant/register-restaurant';
import { Store } from 'lucide-react';
import Link from 'next/link';

export default function RestaurantRegisterPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col pt-10 pb-20 px-4">

      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Store className="w-8 h-8 text-orange-500" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">Đăng ký đối tác nhà hàng</h1>
            <p className="text-zinc-400 mb-10 text-lg">
              Mở rộng cơ hội kinh doanh và tiếp cận hàng ngàn khách hàng tiềm năng cùng FoodDelivery.
            </p>

            <RegisterRestaurantForm />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Bằng việc gửi yêu cầu, bạn đồng ý với các <Link href="#" className="text-orange-500 hover:underline">Điều khoản & Điều kiện</Link> của chúng tôi.
          </p>
        </div>
      </div>
    </div>
  );
}
