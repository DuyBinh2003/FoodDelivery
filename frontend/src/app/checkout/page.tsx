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
} from 'lucide-react';
import {
  AddressSelectorModal,
  getUserAddresses,
  type UserAddress,
} from '@/features/address';
import { LoyaltyCheckoutSection } from '@/features/loyalty';

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
  const total = Math.max(0, subtotal - pointsDiscount) + shippingFee;

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
    <div className="min-h-screen bg-background pb-28 text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-border px-4 py-3.5 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-foreground ml-2">Thanh toán đơn hàng</h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-muted-foreground">
              <CreditCard className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1.5">Giỏ hàng trống</h2>
            <p className="text-muted-foreground text-sm mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng.</p>
            <button
              onClick={() => router.push('/menu')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-sm cursor-pointer"
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
          <>
            {errorMsg && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex gap-3 items-start animate-fade-in">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}

            {/* Delivery Info */}
            <section className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-foreground font-semibold text-sm sm:text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Địa chỉ giao hàng
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {selectedAddress ? 'Đổi địa chỉ' : 'Chọn địa chỉ'}
                </button>
              </div>

              <div
                onClick={() => setIsAddressModalOpen(true)}
                className="bg-secondary/30 border border-border/60 hover:border-border rounded-xl p-3.5 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-semibold flex items-center gap-2 text-sm">
                    {finalRecipientName}
                    {finalRecipientPhone ? ` • ${finalRecipientPhone}` : ''}
                  </span>
                  {selectedAddress && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                      {selectedAddress.label === 'HOME' ? (
                        <>
                          <Home className="w-3 h-3 text-sky-400" /> Nhà riêng
                        </>
                      ) : selectedAddress.label === 'WORK' ? (
                        <>
                          <Briefcase className="w-3 h-3 text-purple-400" /> Cơ quan
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-amber-400" /> Khác
                        </>
                      )}
                    </span>
                  )}
                  {selectedAddress?.is_default && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Mặc định
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed group-hover:text-foreground transition-colors">
                  {finalDeliveryAddress}
                </p>

                {selectedAddress?.delivery_notes && (
                  <p className="text-[11px] text-muted-foreground/80 italic mt-1.5 pt-1.5 border-t border-border/40">
                    <span className="not-italic text-muted-foreground font-medium">Ghi chú: </span>
                    {selectedAddress.delivery_notes}
                  </p>
                )}
              </div>
            </section>

            {/* Payment Method Selection */}
            <section className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-foreground font-semibold text-sm sm:text-base flex items-center gap-2">
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
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-secondary/30 hover:border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center mt-0.5">
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

                      {/* Wallet Balance Display */}
                      <div className="mt-2 flex items-center gap-2.5">
                        <span className="text-xs text-muted-foreground">
                          Số dư khả dụng:{' '}
                          <strong className="text-foreground font-semibold font-mono">
                            {isLoadingWallet ? 'Đang tải...' : formatVND(availableBalance)}
                          </strong>
                        </span>

                        {walletData && (
                          isBalanceSufficient ? (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Đủ số dư
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsTopupModalOpen(true);
                              }}
                              className="text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <PlusCircle className="w-3 h-3" /> Nạp thêm
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all mt-1 ${
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
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-secondary/30 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-xs">
                      VNPAY
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold text-sm">Cổng thanh toán VNPAY QR</span>
                        <span className="text-[10px] bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded-full border border-border">
                          Thẻ / QR Ngân hàng
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Quét mã QR qua 40+ ứng dụng ngân hàng & Thẻ quốc tế
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
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
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-secondary/30 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center font-bold text-xs">
                      MOMO
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold text-sm">Ví điện tử MoMo</span>
                        <span className="text-[10px] bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded-full border border-border">
                          Ví điện tử
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Thanh toán bảo mật tức thì qua ứng dụng Ví MoMo
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      paymentMethod === 'MOMO'
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/40 bg-transparent'
                    }`}
                  />
                </div>
              </div>

              {/* Option 4: Cash On Delivery (COD) */}
              <div
                onClick={() => setPaymentMethod('COD')}
                className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  paymentMethod === 'COD'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-secondary/30 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center">
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
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      paymentMethod === 'COD'
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/40 bg-transparent'
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* Order Items Preview */}
            <section className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-sm">
              <h2 className="text-foreground font-semibold text-sm sm:text-base">Món đã chọn ({getTotalItems()})</h2>
              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-start first:pt-0 last:pb-0">
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 bg-secondary text-secondary-foreground rounded flex items-center justify-center text-xs font-bold mt-0.5">
                        {item.quantity}x
                      </div>
                      <div>
                        <h4 className="text-foreground text-sm font-medium">{item.name}</h4>
                        {item.options && item.options.length > 0 && (
                          <p className="text-muted-foreground text-xs mt-0.5">{item.options.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-foreground text-sm font-medium font-mono">
                      {formatVND(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Customer Note / Message for Restaurant & Driver */}
            <section className="bg-card border border-border rounded-2xl p-5 space-y-2.5 shadow-sm">
              <h2 className="text-foreground font-semibold text-sm sm:text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Ghi chú cho nhà hàng & tài xế
              </h2>
              <p className="text-xs text-muted-foreground">
                Thêm yêu cầu chế biến (ví dụ: ít hành, nước dùng để riêng, không cay) hoặc lưu ý giao hàng
              </p>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Ví dụ: Ít hành lá, nước lèo để riêng, thêm tương ớt..."
                rows={2}
                maxLength={300}
                className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-colors resize-none"
              />
            </section>

            {/* Loyalty Points Section */}
            <LoyaltyCheckoutSection
              subtotal={subtotal}
              onPointsChange={(points, discount) => {
                setPointsToUse(points);
                setPointsDiscount(discount);
              }}
            />

            {/* Price Summary */}
            <section className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
              <h2 className="text-foreground font-semibold text-sm sm:text-base mb-1">Chi tiết thanh toán</h2>
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Tiền món ăn (Tạm tính)</span>
                <span className="text-foreground font-medium font-mono">{formatVND(subtotal)}</span>
              </div>
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-amber-400 text-sm font-medium animate-in fade-in">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Giảm giá từ điểm ({pointsToUse.toLocaleString('vi-VN')} điểm)
                  </span>
                  <span className="font-mono font-bold">-{formatVND(pointsDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground text-sm">
                <span className="flex items-center gap-1.5">
                  Phí giao hàng (Cố định)
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-semibold border border-border">
                    Mặc định
                  </span>
                </span>
                <span className="text-foreground font-medium font-mono">{formatVND(shippingFee)}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-foreground font-bold">Tổng thanh toán</span>
                <span className="text-xl font-bold text-primary font-mono">{formatVND(total)}</span>
              </div>
            </section>
          </>
        )}
      </div>

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

      {/* Fixed Bottom Bar */}
      {items.length > 0 && !isValidating && (
        <div className="fixed bottom-0 left-0 right-0 p-3.5 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border z-20">
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
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
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
