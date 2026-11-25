import React from 'react';
import Link from 'next/link';
import { Store, Bike, ArrowRight, ShieldCheck, DollarSign, Clock, Users } from 'lucide-react';

export default function PartnerRegistrationHubPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/12 border border-primary/25 text-primary text-xs font-bold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cổng Đăng Ký Đối Tác Chính Thức
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Đồng Hành Cùng <span className="text-primary">FoodDelivery</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Khám phá cơ hội hợp tác kinh doanh hoặc gia tăng thu nhập hàng ngày. Chọn vai trò phù hợp và hoàn tất hồ sơ đăng ký trong 2 phút.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Card: Nhà Hàng */}
          <div className="group relative bg-card border border-border rounded-3xl p-8 sm:p-10 hover:border-primary/50 transition-all duration-300 hover:shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/12 border border-primary/25 flex items-center justify-center text-primary mb-6 group-hover:scale-105 transition-transform">
                <Store className="w-8 h-8" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Đối Tác Nhà Hàng
              </span>
              <h2 className="font-heading text-2xl font-extrabold text-foreground mt-1 mb-3">
                Mở Quán & Bán Hàng
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Mở rộng tệp khách hàng online không giới hạn. Tự chủ quản lý thực đơn, điều chỉnh giá bán và theo dõi doanh thu theo thời gian thực.
              </p>

              <div className="space-y-2.5 mb-8 text-sm text-foreground/85">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span>Tiếp cận hàng ngàn đơn hàng mỗi ngày</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Kích hoạt gian hàng nhanh chóng</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Hỗ trợ kỹ thuật & marketing đồng hành</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-border">
              <Link
                href="/register/restaurant"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary-dark shadow-sm transition-all"
              >
                <span>Đăng ký mở quán ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card: Tài Xế */}
          <div className="group relative bg-card border border-border rounded-3xl p-8 sm:p-10 hover:border-primary/50 transition-all duration-300 hover:shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-105 transition-transform">
                <Bike className="w-8 h-8" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Đối Tác Tài Xế
              </span>
              <h2 className="font-heading text-2xl font-extrabold text-foreground mt-1 mb-3">
                Giao Hàng & Tăng Thu Nhập
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Tự do làm chủ lịch trình, nhận đơn linh hoạt bất kỳ lúc nào bạn rảnh. Chính sách cước phí và thưởng minh bạch hàng đầu.
              </p>

              <div className="space-y-2.5 mb-8 text-sm text-foreground/85">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Tự do lựa chọn thời gian nhận đơn</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span>Thu nhập hấp dẫn, rút tiền nhanh</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Bảo hiểm & bảo vệ chuyến đi đầy đủ</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-border">
              <Link
                href="/register/driver"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary-dark shadow-sm transition-all"
              >
                <span>Đăng ký làm tài xế ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <p>
            Mỗi tài khoản được phép sở hữu tối đa <strong className="text-foreground">1 Nhà hàng</strong> và{' '}
            <strong className="text-foreground">1 Hồ sơ tài xế</strong>. Hồ sơ sau khi gửi sẽ được Ban quản trị phê duyệt theo thời gian thực.
          </p>
        </div>
      </div>
    </div>
  );
}
