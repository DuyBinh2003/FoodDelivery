import React from 'react';
import Link from 'next/link';
import { Store, Star, Clock, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import FoodCard from '@/features/menu/components/food-card/food-card';
import type { FoodListProps } from './types';

export default function FoodList({ items, restaurantName, mode = 'menu' }: FoodListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white/[0.02] rounded-3xl border border-white/5">
        <Store className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-base font-medium">Không tìm thấy món ăn nào trong danh mục này.</p>
      </div>
    );
  }

  const restaurantId = items[0]?.restaurant_id;

  return (
    <section className="bg-zinc-950/40 rounded-3xl p-5 sm:p-7 border border-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xs transition-all duration-300">
      {/* Restaurant Header Section (khi ở chế độ menu toàn sàn) */}
      {restaurantName && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3.5">
            {/* Store Icon Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Store className="w-6 h-6 text-orange-400" />
            </div>

            {/* Store Information */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight hover:text-orange-400 transition-colors">
                  {restaurantId ? (
                    <Link href={`/restaurant/${restaurantId}`}>
                      {restaurantName}
                    </Link>
                  ) : (
                    restaurantName
                  )}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Đối tác chính thức
                </span>
              </div>

              {/* Meta indicators: Rating, Delivery time, Distance */}
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  4.8
                  <span className="text-zinc-500 font-normal">(100+)</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  20 - 30 phút
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  Gần bạn
                </span>
              </div>
            </div>
          </div>

          {/* Call-to-action Link to Restaurant Page */}
          {restaurantId && (
            <Link
              href={`/restaurant/${restaurantId}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all duration-200 shrink-0 group self-start sm:self-auto"
            >
              Xem quán & ưu đãi
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* Grid of Food Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item, index) => (
          <FoodCard key={item.id} item={item} index={index} mode={mode} />
        ))}
      </div>
    </section>
  );
}
