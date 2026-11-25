"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/features/cart';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  getCustomerWallet,
  processOrderPayment,
  QuickTopupModal,
  OnlinePaymentGatewayModal,
  createGatewayPaymentUrl,
  type WalletDetailsResponse,
  type PaymentMethod,
  type PaymentUrlResponse,
} from '@/features/payment';
import { createOrder } from '@/features/orders/api/order-api';
import {
  MapPin,
  ChevronLeft,
  CreditCard,
  AlertCircle,
  Wallet,
  PlusCircle,
  Banknote,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Edit2,
  Home,
  Briefcase,
  QrCode,
  Tag,
  Zap,
} from 'lucide-react';
import {
  AddressSelectorModal,
  getUserAddresses,
  type UserAddress,
} from '@/features/address';
import { LoyaltyCheckoutSection } from '@/features/loyalty';
import { VoucherSelectionDrawer } from '@/features/promotions/components/voucher-selection-drawer';
import type { BestComboResult } from '@/features/promotions/services/promotion-api.client';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, restaurantId, getSubtotal, getTotalItems, clearCart } = useCartStore();
  const { validateCart, isValidating } = useCartValidation();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WALLET');
  const [walletData, setWalletData] = useState<WalletDetailsResponse | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [gatewayPaymentData, setGatewayPaymentData] = useState<PaymentUrlResponse | null>(null);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const [pointsDiscount, setPointsDiscount] = useState<number>(0);
  const [selectedVouchers, setSelectedVouchers] = useState<BestComboResult['selected_vouchers']>([]);
  const [isVoucherDrawerOpen, setIsVoucherDrawerOpen] = useState(false);

  // Address Book state
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const hasValidatedRef = useRef(false);
  const fetchedCustomerIdRef = useRef<string | null>(null);

  const customerId = user?.id || '';
  const customerName = user?.name || user?.email || 'Khách hàng';
  const customerPhone = (user?.customerProfile?.phone as string) || '';
  const customerAddress =
    (user?.customerProfile?.address as string) || 'Chưa cập nhật địa chỉ giao hàng';

  const finalRecipientName = selectedAddress?.recipient_name || customerName;
  const finalRecipientPhone = selectedAddress?.recipient_phone || customerPhone;
  const finalDeliveryAddress = selectedAddress?.full_address || customerAddress;
  const finalDeliveryLat = selectedAddress?.latitude ? Number(selectedAddress.latitude) : undefined;
  const finalDeliveryLng = selectedAddress?.longitude ? Number(selectedAddress.longitude) : undefined;

  const subtotal = getSubtotal();
  const shippingFee = 15000;

  const shippingVoucherDiscount = selectedVouchers
    .filter((v) => v.category === 'FREE_SHIPPING')
    .reduce((sum, v) => sum + v.discount_amount, 0);

  const foodVoucherDiscount = selectedVouchers
    .filter((v) => v.category !== 'FREE_SHIPPING')
    .reduce((sum, v) => sum + v.discount_amount, 0);

  const effectiveFoodTotal = Math.max(0, subtotal - pointsDiscount - foodVoucherDiscount);
  const effectiveShipping = Math.max(0, shippingFee - shippingVoucherDiscount);
  const total = effectiveFoodTotal + effectiveShipping;

  const availableBalance = Number(walletData?.balance?.available_balance || 0);
  const isBalanceSufficient = availableBalance >= total;

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  // Fetch or refresh wallet details
  const fetchWallet = useCallback(async () => {
    try {
      setIsLoadingWallet(true);
      const res = await getCustomerWallet(customerId);
      setWalletData(res);
    } catch (err) {
      console.error('Failed to load customer wallet:', err);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [customerId]);

  // Initial cart validation: runs only once per mount
  useEffect(() => {
    if (hasValidatedRef.current) return;
    if (items.length === 0) return;

    hasValidatedRef.current = true;
    validateCart().then((result) => {
      if (!result.isValid) {
        setErrorMsg(result.message || 'Lỗi kiểm tra giỏ hàng.');
      }
    });
  }, [items.length, validateCart]);

  // Fetch wallet: runs only once per customerId
  useEffect(() => {
    if (!customerId || fetchedCustomerIdRef.current === customerId) return;
    fetchedCustomerIdRef.current = customerId;
    fetchWallet();
  }, [customerId, fetchWallet]);

  // Fetch saved addresses from address book on mount / customerId change
  useEffect(() => {
    if (!customerId) return;
    let active = true;

    getUserAddresses()
      .then((list) => {
        if (active) {
          setAddresses(list);
          if (list.length > 0) {
            const def = list.find((a) => a.is_default) || list[0];
            setSelectedAddress((curr) => curr ?? def);
          }
        }
      })
      .catch((err: unknown) => {
        console.warn('Failed to load user addresses for checkout:', err);
      });

    return () => {
      active = false;
    };
  }, [customerId]);

  // Refresh saved addresses callback for modal updates
  const fetchAddresses = useCallback(async () => {
    try {
      const list = await getUserAddresses();
      setAddresses(list);
      if (list.length > 0) {
        const def = list.find((a) => a.is_default) || list[0];
        setSelectedAddress(def);
      }
    } catch (err: unknown) {
      console.warn('Failed to load user addresses for checkout:', err);
    }
  }, []);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    // If paying via wallet but balance is insufficient, open topup modal
    if (paymentMethod === 'WALLET' && !isBalanceSufficient) {
      setIsTopupModalOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (!customerId) {
        setErrorMsg('Vui lòng đăng nhập để tiến hành đặt hàng.');
        router.push('/login?redirect=/checkout');
        return;
      }

      if (!restaurantId) {
        setErrorMsg('Không tìm thấy thông tin nhà hàng cho giỏ hàng. Vui lòng chọn lại món.');
        return;
      }

      // 1. Create order in order-service with address snapshot
      const orderPayload = {
        restaurant_id: restaurantId,
        delivery_address: finalDeliveryAddress,
        delivery_lat: finalDeliveryLat,
        delivery_lng: finalDeliveryLng,
        recipient_name: finalRecipientName,
        recipient_phone: finalRecipientPhone,
        note: orderNote.trim() || undefined,
        points_to_use: pointsToUse > 0 ? pointsToUse : undefined,
        voucher_id: selectedVouchers[0]?.id,
        voucher_code: selectedVouchers.length > 0 ? selectedVouchers.map((v) => v.code).join('+') : undefined,
        items: items.map((item) => ({
          menu_item_id: item.item_id,
          name: item.name,
          quantity: Number(item.quantity),
          unit_price: Number(item.price),
          options: item.options || [],
          notes: item.options && item.options.length > 0 ? item.options.join(', ') : undefined,
        })),
      };

      const createdOrder = await createOrder(orderPayload);

      // 2. Gateway Online Payment (VNPAY / MOMO)
      if (paymentMethod === 'VNPAY' || paymentMethod === 'MOMO') {
        const returnUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/payment/return?orderId=${createdOrder.id}`
          : undefined;

        const gatewayRes = await createGatewayPaymentUrl({
          amount: total,
          paymentMethod,
          orderId: createdOrder.id,
          returnUrl,
        });

        setPendingOrderId(createdOrder.id);
        setGatewayPaymentData(gatewayRes);
        setIsGatewayModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // 3. Process payment for WALLET / COD in payment-service
      const idempotencyKey = `pay-${createdOrder.id}`;
      await processOrderPayment({
        orderId: createdOrder.id,
        customerId,
        restaurantId,
        amount: total.toString(),
        subtotal: subtotal.toString(),
        deliveryFee: shippingFee.toString(),
        paymentMethod,
        idempotencyKey,
      });

      // 4. Clear cart and redirect to order tracker
      clearCart();
      router.push(`/orders/${createdOrder.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-16 text-foreground">
      {/* Sub-header & Progress Stepper */}
      <div className="bg-card/80 border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              aria-label="Quay lại"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-lg sm:text-xl font-extrabold text-foreground">
              Thanh toán đơn hàng
            </h1>
          </div>

          {/* 4-Step Progress Stepper */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/12 text-primary">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Giỏ hàng
            </span>
            <span className="w-4 h-px bg-border" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-xs">
              2. Giao nhận & Thanh toán
            </span>
            <span className="w-4 h-px bg-border hidden sm:inline-block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
              3. Xác nhận
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {items.length === 0 ? (
          <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-primary">
              <CreditCard className="w-8 h-8" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-1.5">Giỏ hàng trống</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá thêm các món ăn tươi ngon nhé!
            </p>
            <button
              type="button"
              onClick={() => router.push('/menu')}
              className="bg-primary hover:bg-primary-dark text-primary-foreground font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        ) : isValidating ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-muted-foreground text-sm">Đang kiểm tra đơn hàng...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN (7 cols): Delivery Info, Items, Note, Payment */}
            <div className="lg:col-span-7 space-y-5">
              {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/25 rounded-2xl p-4 flex gap-3 items-start animate-in">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive font-medium">{errorMsg}</p>
                </div>
              )}

              {/* Delivery Info */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-foreground font-bold text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Địa chỉ giao hàng
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {selectedAddress ? 'Đổi địa chỉ' : 'Chọn địa chỉ'}
                  </button>
                </div>

                <div
                  onClick={() => setIsAddressModalOpen(true)}
                  className="bg-secondary/50 border border-border hover:border-primary/40 rounded-xl p-3.5 cursor-pointer transition-colors group"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-foreground font-bold flex items-center gap-2 text-sm">
                      {finalRecipientName}
                      {finalRecipientPhone ? ` • ${finalRecipientPhone}` : ''}
                    </span>
                    {selectedAddress && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-card text-foreground border border-border">
                        {selectedAddress.label === 'HOME' ? (
                          <>
                            <Home className="w-3 h-3 text-sky-500" /> Nhà riêng
                          </>
                        ) : selectedAddress.label === 'WORK' ? (
                          <>
                            <Briefcase className="w-3 h-3 text-purple-500" /> Cơ quan
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3 text-amber-500" /> Khác
                          </>
                        )}
                      </span>
                    )}
                    {selectedAddress?.is_default && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/12 text-primary border border-primary/25">
                        Mặc định
                      </span>
                    )}
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed group-hover:text-foreground transition-colors">
                    {finalDeliveryAddress}
                  </p>

                  {selectedAddress?.delivery_notes && (
                    <p className="text-[11px] text-muted-foreground italic mt-1.5 pt-1.5 border-t border-border/60">
                      <span className="not-italic text-foreground/80 font-medium">Ghi chú: </span>
                      {selectedAddress.delivery_notes}
                    </p>
                  )}
                </div>
              </section>

              {/* Order Items Preview */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
                <h2 className="font-heading text-foreground font-bold text-base">
                  Món đã chọn ({getTotalItems()})
                </h2>
                <div className="divide-y divide-border/70">
                  {items.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-start first:pt-0 last:pb-0">
                      <div className="flex gap-3">
                        <div className="w-7 h-7 bg-primary/12 text-primary rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                          {item.quantity}x
                        </div>
                        <div>
                          <h4 className="text-foreground text-sm font-semibold">{item.name}</h4>
                          {item.options && item.options.length > 0 && (
                            <p className="text-muted-foreground text-xs mt-0.5">{item.options.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-foreground text-sm font-bold font-mono tabular-nums">
                        {formatVND(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Customer Note */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-2.5 shadow-xs">
                <h2 className="font-heading text-foreground font-bold text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Ghi chú cho nhà hàng & tài xế
                </h2>
                <p className="text-xs text-muted-foreground">
                  Thêm yêu cầu chế biến hoặc lưu ý giao hàng cho tài xế
                </p>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ví dụ: Ít hành lá, nước lèo để riêng, gọi khi tới cổng..."
                  rows={2}
                  maxLength={300}
                  className="w-full bg-background border border-input rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors resize-none"
                />
              </section>

              {/* Payment Method Selection */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-foreground font-bold text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Phương thức thanh toán
                  </h2>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    An toàn & Nhanh chóng
                  </span>
                </div>

                {/* Option 1: FoodPay In-App Wallet */}
                <div
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    paymentMethod === 'WALLET'
                      ? 'border-primary bg-primary/8 shadow-xs'
                      : 'border-border bg-secondary/40 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mt-0.5 shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-bold text-sm">Ví điện tử FoodPay</span>
                          <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/25">
                            Khuyên dùng
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Thanh toán bảo mật tức thì, không cần tiền mặt
                        </p>

                        <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Số dư khả dụng:{' '}
                            <strong className="text-foreground font-semibold font-mono">
                              {isLoadingWallet ? 'Đang tải...' : formatVND(availableBalance)}
                            </strong>
                          </span>

                          {walletData && (
                            isBalanceSufficient ? (
                              <span className="text-[11px] text-primary flex items-center gap-1 font-semibold bg-primary/12 px-2 py-0.5 rounded-full border border-primary/25">
                                <CheckCircle2 className="w-3 h-3" /> Đủ số dư
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsTopupModalOpen(true);
                                }}
                                className="text-[11px] bg-primary hover:bg-primary-dark text-primary-foreground font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" /> Nạp thêm
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all mt-1 shrink-0 ${
                        paymentMethod === 'WALLET'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-transparent'
                      }`}
                    />
                  </div>
                </div>

                {/* Option 2: VNPAY QR */}
                <div
                  onClick={() => setPaymentMethod('VNPAY')}
                  className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    paymentMethod === 'VNPAY'
                      ? 'border-primary bg-primary/8 shadow-xs'
                      : 'border-border bg-secondary/40 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                        VNPAY
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-bold text-sm">Cổng thanh toán VNPAY QR</span>
                          <span className="text-[10px] bg-card text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border">
                            Thẻ / QR
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Quét mã QR qua 40+ ứng dụng ngân hàng & Thẻ quốc tế
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all shrink-0 ${
                        paymentMethod === 'VNPAY'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-transparent'
                      }`}
                    />
                  </div>
                </div>

                {/* Option 3: MoMo Wallet */}
                <div
                  onClick={() => setPaymentMethod('MOMO')}
                  className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    paymentMethod === 'MOMO'
                      ? 'border-primary bg-primary/8 shadow-xs'
                      : 'border-border bg-secondary/40 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-xs shrink-0">
                        MOMO
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-bold text-sm">Ví điện tử MoMo</span>
                          <span className="text-[10px] bg-card text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border">
                            Ví điện tử
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Thanh toán bảo mật tức thì qua ứng dụng Ví MoMo
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all shrink-0 ${
                        paymentMethod === 'MOMO'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-transparent'
                      }`}
                    />
                  </div>
                </div>

                {/* Option 4: COD */}
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    paymentMethod === 'COD'
                      ? 'border-primary bg-primary/8 shadow-xs'
                      : 'border-border bg-secondary/40 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-card border border-border text-muted-foreground flex items-center justify-center shrink-0">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-foreground font-bold text-sm">Tiền mặt khi nhận hàng (COD)</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Thanh toán trực tiếp cho tài xế khi giao đồ ăn
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all shrink-0 ${
                        paymentMethod === 'COD'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-transparent'
                      }`}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN (5 cols): Sticky Loyalty, Vouchers, Price Summary & Desktop CTA */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
              <LoyaltyCheckoutSection
                subtotal={subtotal}
                onPointsChange={(points, discount) => {
                  setPointsToUse(points);
                  setPointsDiscount(discount);
                }}
              />

              {/* Voucher Section */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-foreground font-bold text-base flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Mã Giảm Giá & Voucher
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsVoucherDrawerOpen(true)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {selectedVouchers.length > 0 ? 'Đổi voucher' : 'Chọn hoặc nhập mã'}
                  </button>
                </div>

                {selectedVouchers.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {selectedVouchers.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/12 border border-amber-500/30 text-amber-700 dark:text-amber-300"
                        >
                          <Tag className="w-3 h-3" />
                          {v.code} (-{formatVND(v.discount_amount)})
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-primary font-semibold">
                      ✓ Đã áp dụng {selectedVouchers.length} ưu đãi (Tiết kiệm {formatVND(foodVoucherDiscount + shippingVoucherDiscount)})
                    </p>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsVoucherDrawerOpen(true)}
                    className="p-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/40 cursor-pointer flex items-center justify-between text-xs text-muted-foreground transition-colors"
                  >
                    <span>Chưa áp dụng voucher. Nhấn để chọn combo!</span>
                    <span className="text-primary font-bold">Chọn ngay →</span>
                  </div>
                )}
              </section>

              {/* Price Summary + Desktop Place Order Button */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-sm">
                <h2 className="font-heading text-foreground font-bold text-base">Chi tiết thanh toán</h2>
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Tiền món ăn (Tạm tính)</span>
                  <span className="text-foreground font-semibold font-mono">{formatVND(subtotal)}</span>
                </div>
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 text-sm font-medium animate-in">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Giảm giá từ điểm ({pointsToUse.toLocaleString('vi-VN')} điểm)
                    </span>
                    <span className="font-mono font-bold">-{formatVND(pointsDiscount)}</span>
                  </div>
                )}
                {foodVoucherDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 text-sm font-medium animate-in">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Giảm giá món ăn (Voucher)
                    </span>
                    <span className="font-mono font-bold">-{formatVND(foodVoucherDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span className="flex items-center gap-1.5">
                    Phí giao hàng
                    <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-semibold border border-border">
                      Tiêu chuẩn
                    </span>
                  </span>
                  <span className="text-foreground font-semibold font-mono">{formatVND(shippingFee)}</span>
                </div>
                {shippingVoucherDiscount > 0 && (
                  <div className="flex justify-between text-primary text-sm font-medium animate-in">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Giảm phí giao hàng (Freeship)
                    </span>
                    <span className="font-mono font-bold">-{formatVND(shippingVoucherDiscount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-foreground font-bold">Tổng thanh toán</span>
                  <span className="text-2xl font-extrabold text-primary font-mono tabular-nums">{formatVND(total)}</span>
                </div>

                {/* Desktop Place Order CTA */}
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !!errorMsg}
                  className={`hidden lg:flex w-full py-3.5 px-6 rounded-xl font-bold text-white transition-all shadow-md items-center justify-center gap-2 cursor-pointer ${
                    isSubmitting || !!errorMsg
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : paymentMethod === 'WALLET' && !isBalanceSufficient
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : paymentMethod === 'VNPAY'
                      ? 'bg-sky-600 hover:bg-sky-500'
                      : paymentMethod === 'MOMO'
                      ? 'bg-pink-600 hover:bg-pink-500'
                      : 'bg-primary hover:bg-primary-dark text-primary-foreground'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xử lý đơn...</span>
                    </>
                  ) : paymentMethod === 'WALLET' && !isBalanceSufficient ? (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Nạp tiền & Đặt hàng</span>
                    </>
                  ) : paymentMethod === 'VNPAY' || paymentMethod === 'MOMO' ? (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Thanh toán QR ngay</span>
                    </>
                  ) : (
                    <span>Đặt hàng ngay</span>
                  )}
                </button>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Voucher Selection Drawer */}
      <VoucherSelectionDrawer
        isOpen={isVoucherDrawerOpen}
        onClose={() => setIsVoucherDrawerOpen(false)}
        restaurantId={restaurantId || ''}
        subtotal={subtotal}
        deliveryFee={shippingFee}
        paymentMethod={paymentMethod}
        selectedVoucherIds={selectedVouchers.map((v) => v.id)}
        onApplyVouchers={(vouchers) => setSelectedVouchers(vouchers)}
      />

      {/* Quick Topup Modal */}
      {walletData && (
        <QuickTopupModal
          isOpen={isTopupModalOpen}
          onClose={() => setIsTopupModalOpen(false)}
          walletAccountId={walletData.wallet.id}
          currentBalance={availableBalance}
          orderTotal={total}
          onTopupSuccess={fetchWallet}
        />
      )}

      {/* Mobile Fixed Bottom Bar */}
      {items.length > 0 && !isValidating && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3.5 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border z-20">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs">
                {paymentMethod === 'WALLET'
                  ? 'Thanh toán qua Ví FoodPay'
                  : paymentMethod === 'VNPAY'
                  ? 'Thanh toán qua Cổng VNPAY QR'
                  : paymentMethod === 'MOMO'
                  ? 'Thanh toán qua Ví MoMo'
                  : 'Thanh toán tiền mặt (COD)'}
              </p>
              <p className="text-lg sm:text-xl font-bold text-foreground font-mono">{formatVND(total)}</p>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !!errorMsg}
              className={`py-3 px-6 rounded-xl font-semibold text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                isSubmitting || !!errorMsg
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : paymentMethod === 'WALLET' && !isBalanceSufficient
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : paymentMethod === 'VNPAY'
                  ? 'bg-sky-600 hover:bg-sky-500'
                  : paymentMethod === 'MOMO'
                  ? 'bg-pink-600 hover:bg-pink-500'
                  : 'bg-primary hover:bg-primary-dark text-primary-foreground'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý đơn...</span>
                </>
              ) : paymentMethod === 'WALLET' && !isBalanceSufficient ? (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Nạp tiền & Đặt hàng</span>
                </>
              ) : paymentMethod === 'VNPAY' || paymentMethod === 'MOMO' ? (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Thanh toán QR ngay</span>
                </>
              ) : (
                <span>Đặt hàng ngay</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Address Selector & Add Modal */}
      <AddressSelectorModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        addresses={addresses}
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={(addr) => setSelectedAddress(addr)}
        onRefreshAddresses={fetchAddresses}
        defaultRecipientName={customerName}
        defaultRecipientPhone={customerPhone}
      />

      {/* Online Gateway Payment Modal (VNPAY / MOMO) */}
      <OnlinePaymentGatewayModal
        isOpen={isGatewayModalOpen}
        onClose={() => setIsGatewayModalOpen(false)}
        paymentData={gatewayPaymentData}
        orderId={pendingOrderId || undefined}
        onPaymentSuccess={() => {
          clearCart();
          if (pendingOrderId) {
            router.push(`/orders/${pendingOrderId}`);
          }
        }}
      />
    </div>
  );
}
