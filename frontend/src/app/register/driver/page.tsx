import { RegisterDriverForm } from '@/features/driver/components/register-driver/register-driver';
import { Bike } from 'lucide-react';
import Link from 'next/link';

export default function DriverRegisterPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col pt-10 pb-20 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-6 text-amber-400">
              <Bike className="w-8 h-8" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">Đăng ký làm đối tác tài xế</h1>
            <p className="text-zinc-400 mb-10 text-base sm:text-lg">
              Gia nhập đội ngũ tài xế FoodDelivery, chủ động thời gian làm việc và tối ưu thu nhập mỗi ngày.
            </p>

            <RegisterDriverForm />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Bằng việc gửi yêu cầu, bạn đồng ý với các{' '}
            <Link href="#" className="text-amber-400 hover:underline">
              Quy chế hoạt động & Điều khoản đối tác
            </Link>{' '}
            của FoodDelivery.
          </p>
        </div>
      </div>
    </div>
  );
}
