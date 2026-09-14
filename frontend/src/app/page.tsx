import Link from 'next/link';
import { UtensilsCrossed, ArrowRight, Zap, Shield, MapPin } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex-1 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-orange-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-red-500/6 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Microservices Architecture
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Đặt món ngon
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              {' '}giao tận nơi
            </span>
          </h1>

          <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto">
            Hệ thống đặt đồ ăn trực tuyến với kiến trúc hiện đại. Khám phá hàng trăm món ăn từ các nhà hàng uy tín.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/menu"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Xem thực đơn
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/orders/f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Theo dõi đơn hàng demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: 'Event-Driven',
              description: 'Xử lý đơn hàng bất đồng bộ qua Amazon SQS. Hệ thống không bao giờ bị nghẽn.',
              gradient: 'from-orange-500/10 to-amber-500/10',
              iconColor: 'text-orange-400',
            },
            {
              icon: Shield,
              title: 'Microservices',
              description: 'Chia tách User, Restaurant, Order Service. Mỗi service vận hành và scale độc lập.',
              gradient: 'from-red-500/10 to-rose-500/10',
              iconColor: 'text-red-400',
            },
            {
              icon: MapPin,
              title: 'Real-time Tracking',
              description: 'Theo dõi trạng thái đơn hàng trực tuyến. Biết ngay khi tài xế đang trên đường.',
              gradient: 'from-pink-500/10 to-fuchsia-500/10',
              iconColor: 'text-pink-400',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
