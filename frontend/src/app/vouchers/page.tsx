'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, Wallet, Flame, CheckCircle2, AlertCircle } from 'lucide-react';
import { promotionApiClient } from '@/features/promotions/services/promotion-api.client';
import type { VoucherFeedItem, WalletVoucher } from '@/features/promotions/services/promotion-api.client';
import { VoucherCard } from '@/features/promotions/components/voucher-card';
import { ClaimVoucherButton } from '@/features/promotions/components/claim-voucher-button';
import { CustomerLayout } from '@/components/layout/customer-layout/customer-layout';

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'wallet'>('feed');
  const [walletFilter, setWalletFilter] = useState<'AVAILABLE' | 'USED' | 'EXPIRED'>('AVAILABLE');
  const [feedItems, setFeedItems] = useState<VoucherFeedItem[]>([]);
  const [walletItems, setWalletItems] = useState<WalletVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(async () => {
      setLoading(true);
      try {
        if (activeTab === 'feed') {
          const feed = await promotionApiClient.getFeed();
          if (isMounted) setFeedItems(feed);
        } else {
          const wallet = await promotionApiClient.getWallet(walletFilter);
          if (isMounted) setWalletItems(wallet);
        }
      } catch (err: unknown) {
        console.warn('[VouchersPage] Failed to load vouchers:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab, walletFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-background text-foreground pb-20">
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-card border border-primary/30 shadow-xl text-sm font-semibold flex items-center gap-2 text-primary animate-in">
            <CheckCircle2 className="w-4 h-4" />
            {toastMessage}
          </div>
        )}

        {/* Hero Header Section */}
        <div className="relative border-b border-border bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/30 dark:via-background dark:to-background py-10 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/12 text-primary border border-primary/25">
              <Flame className="w-3.5 h-3.5" />
              Đại Tiệc Khuyến Mãi Flash Sale
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Kho Voucher & Ví Ưu Đãi Đa Tầng
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Săn mã giảm giá món ăn, mã freeship và ưu đãi ví điện tử. Áp dụng gộp 4 tầng mã ưu đãi trong cùng 1 đơn hàng để tiết kiệm tối đa!
            </p>

            {/* Tab Selector */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'feed'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                Săn Mã Flash Sale
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'wallet'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Wallet className="w-4 h-4" />
                Ví Voucher Của Tôi
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {activeTab === 'feed' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Mã Giảm Giá Đang Mở Bán
                </h2>
                <span className="text-xs text-muted-foreground">Cập nhật thời gian thực</span>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-44 rounded-2xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : feedItems.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-border bg-card space-y-3">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground font-medium">
                    Hiện chưa có mã Flash Sale mới. Vui lòng quay lại sau!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedItems.map((item) => (
                    <VoucherCard
                      key={item.id}
                      id={item.id}
                      code={item.code}
                      name={item.name}
                      description={item.description}
                      category={item.voucher_category}
                      discountValue={item.discount_value}
                      discountType={item.voucher_type}
                      maxDiscountAmount={item.max_discount_amount}
                      minOrderAmount={item.min_order_amount}
                      expiresAt={item.valid_to}
                      claimedPercentage={item.claimed_percentage}
                      isAlmostFull={item.is_almost_full}
                      actionButton={
                        <ClaimVoucherButton
                          voucherId={item.id}
                          hasClaimed={item.has_claimed}
                          onSuccess={() => showToast(`Đã lưu mã ${item.code} vào ví thành công!`)}
                          onError={(msg) => showToast(`Lỗi: ${msg}`)}
                        />
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-border pb-4">
                {(['AVAILABLE', 'USED', 'EXPIRED'] as const).map((st) => {
                  const label = st === 'AVAILABLE' ? 'Khả Dụng' : st === 'USED' ? 'Đã Sử Dụng' : 'Hết Hạn';
                  const isCurrent = walletFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setWalletFilter(st)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 rounded-2xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : walletItems.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-border bg-card space-y-3">
                  <Wallet className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground font-medium">
                    Không tìm thấy voucher nào trong mục này.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('feed')}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs cursor-pointer"
                  >
                    Khám Phá Săn Mã Ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {walletItems.map((item) => (
                    <VoucherCard
                      key={item.id}
                      id={item.voucher_id}
                      code={item.code}
                      name={item.name}
                      description={item.description}
                      category={item.voucher_category}
                      discountValue={item.discount_value}
                      discountType={item.voucher_type}
                      maxDiscountAmount={item.max_discount_amount}
                      minOrderAmount={item.min_order_amount}
                      expiresAt={item.expires_at}
                      disabled={walletFilter !== 'AVAILABLE'}
                      disabledReason={
                        walletFilter === 'USED'
                          ? 'Đã áp dụng trong đơn hàng'
                          : walletFilter === 'EXPIRED'
                            ? 'Đã quá hạn sử dụng'
                            : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
