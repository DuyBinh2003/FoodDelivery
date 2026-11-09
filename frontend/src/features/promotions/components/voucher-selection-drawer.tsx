'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, Sparkles, AlertCircle } from 'lucide-react';
import { promotionApiClient } from '@/features/promotions/services/promotion-api.client';
import type { BestComboResult, WalletVoucher } from '@/features/promotions/services/promotion-api.client';
import { VoucherCard } from '@/features/promotions/components/voucher-card';
import { BestValueComboBanner } from '@/features/promotions/components/best-value-combo-banner';

export interface VoucherSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  subtotal: number;
  deliveryFee: number;
  paymentMethod?: string;
  selectedVoucherIds: string[];
  onApplyVouchers: (selectedVouchers: BestComboResult['selected_vouchers']) => void;
}

export const VoucherSelectionDrawer: React.FC<VoucherSelectionDrawerProps> = ({
  isOpen,
  onClose,
  restaurantId,
  subtotal,
  deliveryFee,
  paymentMethod = 'COD',
  selectedVoucherIds: initialSelectedIds,
  onApplyVouchers,
}) => {
  const [loading, setLoading] = useState(false);
  const [comboResult, setComboResult] = useState<BestComboResult | null>(null);
  const [walletVouchers, setWalletVouchers] = useState<WalletVoucher[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [manualCode, setManualCode] = useState('');
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);
  const [isComboApplied, setIsComboApplied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    void Promise.resolve().then(async () => {
      setLoading(true);
      setManualCodeError(null);
      try {
        const [wallet, combo] = await Promise.all([
          promotionApiClient.getWallet('AVAILABLE').catch(() => []),
          promotionApiClient.recommendBestCombo({
            restaurant_id: restaurantId,
            subtotal,
            delivery_fee: deliveryFee,
            payment_method: paymentMethod,
          }),
        ]);

        if (isMounted) {
          setWalletVouchers(wallet);
          setComboResult(combo);

          const comboIds = combo.selected_vouchers.map((v) => v.id);
          if (initialSelectedIds.length > 0 && initialSelectedIds.every((id) => comboIds.includes(id))) {
            setIsComboApplied(true);
          }
        }
      } catch {
        // Handled gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, restaurantId, subtotal, deliveryFee, paymentMethod, initialSelectedIds]);

  const handleApplyCombo = () => {
    if (!comboResult) return;
    const comboIds = comboResult.selected_vouchers.map((v) => v.id);
    setSelectedIds(comboIds);
    setIsComboApplied(true);
  };

  const handleToggleVoucher = (voucher: WalletVoucher) => {
    setIsComboApplied(false);
    const category = voucher.voucher_category;

    // Find any existing voucher with the same category
    const existingSameCat = walletVouchers.find(
      (wv) => selectedIds.includes(wv.voucher_id) && wv.voucher_category === category,
    );

    let nextIds: string[];
    if (selectedIds.includes(voucher.voucher_id)) {
      // Deselect
      nextIds = selectedIds.filter((id) => id !== voucher.voucher_id);
    } else {
      // Remove other voucher of same category, then add this one (Mutual Exclusion per tier)
      nextIds = selectedIds.filter((id) => id !== existingSameCat?.voucher_id);
      nextIds.push(voucher.voucher_id);
    }

    setSelectedIds(nextIds);
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setManualCodeError(null);
    try {
      const res = await promotionApiClient.validateCode(manualCode.trim(), restaurantId, subtotal, deliveryFee);
      if (res?.is_valid) {
        // Re-evaluate combo with this manual code
        const updated = await promotionApiClient.recommendBestCombo({
          restaurant_id: restaurantId,
          subtotal,
          delivery_fee: deliveryFee,
          payment_method: paymentMethod,
          voucher_codes: [manualCode.trim().toUpperCase()],
        });
        setComboResult(updated);
        setManualCode('');
      }
    } catch (err: unknown) {
      setManualCodeError(err instanceof Error ? err.message : 'Mã giảm giá không hợp lệ hoặc không áp dụng được');
    }
  };

  const handleConfirm = () => {
    if (!comboResult) {
      onClose();
      return;
    }

    // Filter selected vouchers
    const activeSelected = comboResult.selected_vouchers.filter((v) => selectedIds.includes(v.id));
    onApplyVouchers(activeSelected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-neutral-100">Chọn Mã Giảm Giá</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Promo Code Input Bar */}
          <form onSubmit={handleManualCodeSubmit} className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã ưu đãi hoặc đối tác..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors shrink-0"
              >
                Áp Dụng
              </button>
            </div>
            {manualCodeError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {manualCodeError}
              </p>
            )}
          </form>

          {/* Best Value 1-Click Suggestion Banner */}
          <BestValueComboBanner
            comboResult={comboResult}
            loading={loading}
            onApplyCombo={handleApplyCombo}
            isApplied={isComboApplied}
          />

          {/* Vouchers Grouped by Categories */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Mã Giảm Giá Khả Dụng (Áp dụng tối đa 1 mã mỗi loại)
            </h4>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-neutral-800/40 animate-pulse border border-neutral-800" />
                ))}
              </div>
            ) : walletVouchers.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-sm">
                Bạn chưa có mã giảm giá nào trong ví. Hãy ghé Kho Voucher để lưu thêm mã hot!
              </div>
            ) : (
              <div className="space-y-3">
                {walletVouchers.map((wv) => {
                  const isSelected = selectedIds.includes(wv.voucher_id);
                  return (
                    <VoucherCard
                      key={wv.id}
                      id={wv.voucher_id}
                      code={wv.code}
                      name={wv.name}
                      description={wv.description}
                      category={wv.voucher_category}
                      discountValue={wv.discount_value}
                      discountType={wv.voucher_type}
                      maxDiscountAmount={wv.max_discount_amount}
                      minOrderAmount={wv.min_order_amount}
                      expiresAt={wv.expires_at}
                      isSelected={isSelected}
                      onSelect={() => handleToggleVoucher(wv)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Ineligible Vouchers Section */}
          {comboResult && comboResult.ineligible_vouchers.length > 0 && (
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Mã Chưa Đủ Điều Kiện Áp Dụng ({comboResult.ineligible_vouchers.length})
              </h4>
              <div className="space-y-2.5">
                {comboResult.ineligible_vouchers.map((iv) => (
                  <VoucherCard
                    key={iv.id}
                    id={iv.id}
                    code={iv.code}
                    name={iv.name}
                    category={iv.category}
                    discountValue={0}
                    minOrderAmount={0}
                    expiresAt={new Date().toISOString()}
                    disabled={true}
                    disabledReason={iv.rejection_reason}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Confirmation Bar */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-neutral-400">Đã chọn: </span>
            <span className="font-bold text-neutral-100">{selectedIds.length} ưu đãi</span>
          </div>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            Đồng Ý & Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
};
