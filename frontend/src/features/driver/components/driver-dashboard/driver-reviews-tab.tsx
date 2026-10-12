'use client';

import React from 'react';
import { Star, MessageSquare, User, Clock, MapPin, ThumbsUp } from 'lucide-react';
import type { DriverReviewsResponse } from '@/features/driver/types/driver.types';

interface DriverReviewsTabProps {
  data: DriverReviewsResponse | null;
  loading?: boolean;
}

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function DriverReviewsTab({ data, loading }: DriverReviewsTabProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-44 bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse" />
        <div className="h-32 bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 border border-dashed border-white/10 rounded-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3">
          <Star className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Chưa có đánh giá nào</h3>
        <p className="text-xs text-zinc-400 max-w-sm">
          Bạn chưa nhận được nhận xét nào từ khách hàng. Hãy hoàn thành các chuyến đi để nhận đánh giá 5 sao!
        </p>
      </div>
    );
  }

  const { average_rating, total_reviews, star_counts, reviews } = data;

  return (
    <div className="space-y-6">
      {/* Top Rating Summary Card */}
      <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Rating Number */}
          <div className="flex flex-col items-center justify-center text-center p-4 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-5xl font-black text-amber-400 tracking-tight">
              {average_rating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(average_rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-400">
              Dựa trên <strong className="text-white">{total_reviews}</strong> lượt đánh giá
            </p>
          </div>

          {/* Star Progress Bars */}
          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = star_counts[stars as keyof typeof star_counts] || 0;
              const percent = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-12 text-zinc-400 shrink-0">
                    <span>{stars}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-zinc-400 font-mono text-[11px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer Reviews List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Nhận xét gần đây ({reviews.length})</span>
        </h3>

        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-md transition-all hover:border-white/20"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">Khách hàng ẩn danh</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      (Đơn #{rev.order_id.slice(0, 8)})
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.driver_rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(rev.created_at)}</span>
              </div>
            </div>

            {/* Comment Text */}
            {rev.comment ? (
              <p className="text-sm text-zinc-200 mt-2 pl-12 leading-relaxed">
                &ldquo;{rev.comment}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-zinc-500 mt-2 pl-12 italic">
                (Khách hàng không để lại nhận xét chữ)
              </p>
            )}

            {/* Delivery address footer */}
            {rev.delivery_address && (
              <div className="mt-3 pt-3 border-t border-white/5 pl-12 flex items-center gap-1.5 text-xs text-zinc-400">
                <MapPin className="w-3 h-3 text-zinc-500" />
                <span className="truncate">Giao tới: {rev.delivery_address}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
