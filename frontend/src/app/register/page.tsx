import React from 'react';
import Link from 'next/link';
import { Store, Bike, ArrowRight, ShieldCheck, DollarSign, Clock, Users } from 'lucide-react';

export default function PartnerRegistrationHubPage() {
  return (
    <div className="min-h-screen bg-black text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cổng Đăng Ký Đối Tác Chính Thức
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Đồng Hành Cùng <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">FoodDelivery</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg">
            Khám phá cơ hội hợp tác kinh doanh hoặc gia tăng thu nhập hàng ngày. Chọn vai trò phù hợp và hoàn tất hồ sơ đăng ký trong 2 phút.
          </p>
        </div>

        {/* 2 Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Card: Nhà Hàng */}
          <div className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
                <Store className="w-8 h-8" />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Đối Tác Nhà Hàng</span>
              <h2 className="text-2xl font-bold text-white mt-1 mb-3">Mở Quán & Bán Hàng</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Mở rộng tệp khách hàng online không giới hạn. Tự chủ quản lý thực đơn, điều chỉnh giá bán và theo dõi doanh thu theo thời gian thực.
              </p>

              <div className="space-y-2.5 mb-8 text-sm text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  <span>Tiếp cận hàng ngàn đơn hàng mỗi ngày</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>Kích hoạt gian hàng nhanh chóng</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span>Hỗ trợ kỹ thuật & marketing đồng hành</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-zinc-800/80">
              <Link
                href="/register/restaurant"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/20 transition-all group-hover:translate-x-0.5"
              >
                <span>Đăng ký mở quán ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card: Tài Xế */}
          <div className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <Bike className="w-8 h-8" />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Đối Tác Tài Xế</span>
              <h2 className="text-2xl font-bold text-white mt-1 mb-3">Giao Hàng & Tăng Thu Nhập</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Tự do làm chủ lịch trình, nhận đơn linh hoạt bất kỳ lúc nào bạn rảnh. Chính sách cước phí và thưởng minh bạch hàng đầu.
              </p>

              <div className="space-y-2.5 mb-8 text-sm text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Tự do lựa chọn thời gian nhận đơn</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Thu nhập hấp dẫn, nhận tiền nhanh</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Bảo hiểm & bảo vệ chuyến đi đầy đủ</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-zinc-800/80">
              <Link
                href="/register/driver"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 transition-all group-hover:translate-x-0.5"
              >
                <span>Đăng ký làm tài xế ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Policy note */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 text-center text-sm text-zinc-400 max-w-2xl mx-auto">
          <p>
            Mỗi tài khoản được phép sở hữu tối đa <strong className="text-white">1 Nhà hàng</strong> và <strong className="text-white">1 Hồ sơ tài xế</strong>.
            Hồ sơ sau khi gửi sẽ được Ban quản trị phê duyệt theo thời gian thực.
          </p>
        </div>
      </div>
    </div>
  );
}
