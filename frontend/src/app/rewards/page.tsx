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
import { CustomerLayout } from '@/components/layout/customer-layout/customer-layout';

export default function RewardsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { profile, isLoading, error, refetch } = useLoyalty();

  const tiers: MembershipTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-background text-foreground pb-24 pt-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Navigation Back & Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-card border border-border px-3.5 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Hero Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/12 border border-primary/25 text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FoodDelivery Rewards Club</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Điểm Thưởng & Hạng Thành Viên
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Tích điểm trên từng đơn hàng thành công, tự động nâng hạng đặc quyền và dùng điểm giảm trực tiếp vào bữa ăn tiếp theo.
            </p>
          </div>

          {!isAuthenticated ? (
            <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mx-auto">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Đăng nhập để xem điểm thưởng
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Tham gia ngay hôm nay để nhận 1 điểm cho mỗi 1.000 VND chi tiêu và mở khóa các đặc quyền hội viên.
              </p>
              <Link
                href="/login?redirect=/rewards"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground font-bold text-sm transition-transform hover:scale-105"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : error ? (
            <div className="p-8 rounded-3xl bg-card border border-destructive/25 text-center space-y-4">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : isLoading && !profile ? (
            <div className="h-64 rounded-3xl bg-card border border-border animate-pulse flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Đang tải thẻ hội viên...</span>
            </div>
          ) : profile ? (
            <>
              <LoyaltyTierCard
                profile={profile}
                customerName={user?.name || user?.email || 'Khách hàng'}
              />

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Coins className="w-4 h-4" />
                    Quy đổi tại Giỏ hàng
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tại bước thanh toán, bật tuỳ chọn <strong className="text-foreground">Dùng điểm tích lũy</strong> để giảm tới 50% tiền món (100 điểm = 1.000 VND).
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold pt-1"
                  >
                    <span>Đặt món tích điểm ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    Cơ chế bảo toàn điểm
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Điểm thưởng được hoàn lại <strong className="text-foreground">100%</strong> vào ví ngay lập tức nếu đơn hàng của bạn bị huỷ vì bất kỳ lý do gì.
                  </p>
                  <span className="text-[11px] text-muted-foreground block pt-1">
                    * Điểm tích lũy trọn đời không bị giảm khi tiêu điểm.
                  </span>
                </div>
              </div>

              {/* Membership Tiers Comparison */}
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Đặc quyền các Hạng Thành Viên
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {tiers.map((tierKey) => {
                    const info = TIER_DETAILS[tierKey];
                    const isCurrent = profile.wallet.tier === tierKey;

                    return (
                      <div
                        key={tierKey}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-primary/8 border-primary shadow-sm ring-1 ring-primary/30'
                            : 'bg-card border-border opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-base">{info.badge.split(' ')[0]}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Hiện tại
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-foreground">{info.badge.split(' ')[1]}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Từ {info.minPoints.toLocaleString('vi-VN')} điểm
                        </p>

                        <div className="mt-3 pt-3 border-t border-border space-y-1">
                          <span className="text-[11px] text-muted-foreground block">Hệ số tích:</span>
                          <span className="text-sm font-extrabold text-primary">{info.multiplier}x</span>
                          <span className="text-[11px] text-muted-foreground block">mỗi 1.000 đ</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Transactions Ledger */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    Lịch sử biến động điểm
                  </h3>
                  <span className="text-xs text-muted-foreground">20 giao dịch gần nhất</span>
                </div>

                {profile.recent_transactions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-card border border-border text-center text-muted-foreground text-sm">
                    Chưa có giao dịch tích/tiêu điểm nào. Hãy đặt đơn hàng đầu tiên để bắt đầu tích điểm!
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
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
                          className="p-4 flex items-center justify-between hover:bg-secondary/40 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                isPositive
                                  ? 'bg-primary/12 text-primary border border-primary/25'
                                  : 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                              }`}
                            >
                              {isPositive ? '+' : '-'}
                            </div>

                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-foreground">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">{dateFormatted}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`text-sm font-extrabold ${
                                isPositive ? 'text-primary' : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isPositive ? `+${tx.points}` : tx.points} điểm
                            </p>
                            <p className="text-[11px] text-muted-foreground">
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
    </CustomerLayout>
  );
}
