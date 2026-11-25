import { RegisterDriverForm } from '@/features/driver/components/register-driver/register-driver';
import { Bike } from 'lucide-react';
import Link from 'next/link';

export default function DriverRegisterPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-10 pb-20 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-primary/12 border border-primary/25 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Bike className="w-8 h-8" />
            </div>

            <h1 className="font-heading text-3xl font-extrabold text-foreground mb-3">
              Đăng ký làm đối tác tài xế
            </h1>
            <p className="text-muted-foreground mb-8 text-base">
              Gia nhập đội ngũ tài xế FoodDelivery, chủ động thời gian làm việc và tối ưu thu nhập mỗi ngày.
            </p>

            <RegisterDriverForm />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Bằng việc gửi yêu cầu, bạn đồng ý với các{' '}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Quy chế hoạt động & Điều khoản đối tác
            </Link>{' '}
            của FoodDelivery.
          </p>
        </div>
      </div>
    </div>
  );
}
