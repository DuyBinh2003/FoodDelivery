"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coins,
  Sparkles,
  ArrowRight,
  History,
  Gift,
  ShieldCheck,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useLoyalty } from '@/features/loyalty/hooks/useLoyalty';
import { LoyaltyTierCard } from '@/features/loyalty/components/LoyaltyTierCard';
import { TIER_DETAILS } from '@/features/loyalty/types/loyalty.types';
import type { MembershipTier } from '@/features/loyalty/types/loyalty.types';

export default function RewardsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { profile, isLoading, error, refetch } = useLoyalty();

  const tiers: MembershipTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

  return (
    <div className="min-h-screen bg-black text-white pb-24 pt-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Back & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Hero Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FoodDelivery Rewards Club</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Điểm Thưởng & Hạng Thành Viên
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Tích điểm trên từng đơn hàng thành công, tự động nâng hạng đặc quyền và dùng điểm giảm trực tiếp vào bữa ăn tiếp theo.
          </p>
        </div>

        {/* Auth Check Gate */}
        {!isAuthenticated ? (
          <div className="p-8 rounded-3xl bg-zinc-900/80 border border-white/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Đăng nhập để xem điểm thưởng</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Tham gia ngay hôm nay để nhận 1 điểm cho mỗi 1.000 VND chi tiêu và mở khóa các đặc quyền hội viên.
            </p>
            <Link
              href="/login?redirect=/rewards"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm transition-transform hover:scale-105"
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : error ? (
          <div className="p-8 rounded-3xl bg-zinc-900/80 border border-red-500/20 text-center space-y-4">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : isLoading && !profile ? (
          <div className="h-64 rounded-3xl bg-zinc-900 border border-white/10 animate-pulse flex items-center justify-center">
            <span className="text-zinc-500 text-sm">Đang tải thẻ hội viên...</span>
          </div>
        ) : profile ? (
          <>
            {/* Membership Tier Hero Card */}
            <LoyaltyTierCard profile={profile} customerName={user?.name || user?.email || 'Khách hàng'} />

            {/* Quick Actions / Tips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Coins className="w-4 h-4" />
                  Quy đổi tại Giỏ hàng
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tại bước thanh toán, bật tuỳ chọn <strong className="text-white">Dùng điểm tích lũy</strong> để giảm tới 50% tiền món (100 điểm = 1.000 VND).
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium pt-1"
                >
                  <span>Đặt món tích điểm ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Cơ chế bảo toàn điểm
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Điểm thưởng được hoàn lại <strong className="text-white">100%</strong> vào ví ngay lập tức nếu đơn hàng của bạn bị huỷ vì bất kỳ lý do gì.
                </p>
                <span className="text-[11px] text-zinc-500 block pt-1">
                  * Điểm tích lũy trọn đời không bị giảm khi tiêu điểm.
                </span>
              </div>
            </div>

            {/* Membership Tiers Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Đặc quyền các Hạng Thành Viên
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {tiers.map((tierKey) => {
                  const info = TIER_DETAILS[tierKey];
                  const isCurrent = profile.wallet.tier === tierKey;

                  return (
                    <div
                      key={tierKey}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-zinc-800/90 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                          : 'bg-zinc-900/50 border-white/5 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base">{info.badge.split(' ')[0]}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Hiện tại
                          </span>
                        )}
                      </div>

                      <h4 className={`font-bold text-sm ${info.textColor}`}>{info.badge.split(' ')[1]}</h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Từ {info.minPoints.toLocaleString('vi-VN')} điểm
                      </p>

                      <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                        <span className="text-[11px] text-zinc-500 block">Hệ số tích:</span>
                        <span className="text-sm font-extrabold text-white">{info.multiplier}x</span>
                        <span className="text-[11px] text-zinc-400 block">mỗi 1.000 đ</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Transactions Ledger */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-zinc-400" />
                  Lịch sử biến động điểm
                </h3>
                <span className="text-xs text-zinc-500">20 giao dịch gần nhất</span>
              </div>

              {profile.recent_transactions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-zinc-500 text-sm">
                  Chưa có giao dịch tích/tiêu điểm nào. Hãy đặt đơn hàng đầu tiên để bắt đầu tích điểm!
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden divide-y divide-white/5">
                  {profile.recent_transactions.map((tx) => {
                    const isPositive = tx.points > 0;
                    const dateFormatted = new Date(tx.created_at).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={tx.id}
                        className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                            }`}
                          >
                            {isPositive ? '+' : '-'}
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-white">{tx.description}</p>
                            <p className="text-xs text-zinc-500">{dateFormatted}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-extrabold ${
                              isPositive ? 'text-emerald-400' : 'text-orange-400'
                            }`}
                          >
                            {isPositive ? `+${tx.points}` : tx.points} điểm
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Số dư: {tx.balance_after.toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
