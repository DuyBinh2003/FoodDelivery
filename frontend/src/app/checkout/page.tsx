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
    <div className="min-h-screen bg-black pb-28 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white ml-2">Thanh toán đơn hàng</h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <CreditCard className="w-12 h-12 text-zinc-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Giỏ hàng trống</h2>
            <p className="text-zinc-400 mb-8">Bạn chưa có sản phẩm nào trong giỏ hàng.</p>
            <button
              onClick={() => router.push('/menu')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        ) : isValidating ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-400">Đang kiểm tra đơn hàng...</p>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 items-start animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{errorMsg}</p>
              </div>
            )}

            {/* Delivery Info */}
            <section className="bg-zinc-900 border border-white/5 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Địa chỉ giao hàng
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {selectedAddress ? 'Đổi địa chỉ' : 'Chọn địa chỉ'}
                </button>
              </div>

              <div
                onClick={() => setIsAddressModalOpen(true)}
                className="bg-zinc-800/40 border border-white/5 hover:border-orange-500/30 rounded-2xl p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-white font-semibold flex items-center gap-2 text-sm">
                    {finalRecipientName}
                    {finalRecipientPhone ? ` • ${finalRecipientPhone}` : ''}
                  </span>
                  {selectedAddress && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {selectedAddress.label === 'HOME' ? (
                        <>
                          <Home className="w-3 h-3 text-blue-400" /> Nhà riêng
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

                <p className="text-zinc-300 text-xs leading-relaxed group-hover:text-white transition-colors">
                  {finalDeliveryAddress}
                </p>

                {selectedAddress?.delivery_notes && (
                  <p className="text-[11px] text-zinc-400 italic mt-1.5 pt-1.5 border-t border-zinc-700/40">
                    <span className="not-italic text-zinc-500 font-medium">Ghi chú: </span>
                    {selectedAddress.delivery_notes}
                  </p>
                )}
              </div>
            </section>

            {/* Payment Method Selection */}
            <section className="bg-zinc-900 border border-white/5 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  Phương thức thanh toán
                </h2>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  An toàn & Nhanh chóng
                </span>
              </div>

              {/* Option 1: FoodPay In-App Wallet */}
              <div
                onClick={() => setPaymentMethod('WALLET')}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                  paymentMethod === 'WALLET'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                    : 'border-white/10 bg-zinc-800/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-500 mt-0.5">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">Ví điện tử FoodPay</span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Thanh toán bảo mật tức thì, không cần tiền mặt
                      </p>

                      {/* Wallet Balance Display */}
                      <div className="mt-2.5 flex items-center gap-3">
                        <span className="text-sm text-zinc-300">
                          Số dư khả dụng:{' '}
                          <strong className="text-white font-semibold">
                            {isLoadingWallet ? 'Đang tải...' : formatVND(availableBalance)}
                          </strong>
                        </span>

                        {walletData && (
                          isBalanceSufficient ? (
                            <span className="text-xs text-green-400 flex items-center gap-1 font-medium bg-green-500/10 px-2 py-0.5 rounded-lg border border-green-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đủ số dư
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsTopupModalOpen(true);
                              }}
                              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-orange-500/20"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Nạp thêm
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-[5px] transition-all ${
                      paymentMethod === 'WALLET'
                        ? 'border-orange-500 bg-black'
                        : 'border-zinc-600 bg-zinc-800'
                    }`}
                  />
                </div>
              </div>

              {/* Option 2: VNPAY QR */}
              <div
                onClick={() => setPaymentMethod('VNPAY')}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                  paymentMethod === 'VNPAY'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-white/10 bg-zinc-800/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-xs text-blue-400">
                      VNPAY
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">Cổng thanh toán VNPAY QR</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                          Thẻ / QR Ngân hàng
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Quét mã QR qua 40+ ứng dụng ngân hàng & Thẻ quốc tế
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-[5px] transition-all ${
                      paymentMethod === 'VNPAY'
                        ? 'border-blue-500 bg-black'
                        : 'border-zinc-600 bg-zinc-800'
                    }`}
                  />
                </div>
              </div>

              {/* Option 3: MoMo Wallet */}
              <div
                onClick={() => setPaymentMethod('MOMO')}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                  paymentMethod === 'MOMO'
                    ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                    : 'border-white/10 bg-zinc-800/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center font-black text-xs text-pink-400">
                      MOMO
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">Ví điện tử MoMo</span>
                        <span className="text-[10px] bg-pink-500/20 text-pink-400 font-semibold px-2 py-0.5 rounded-full border border-pink-500/30">
                          Ví điện tử
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Thanh toán bảo mật tức thì qua ứng dụng Ví MoMo
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-[5px] transition-all ${
                      paymentMethod === 'MOMO'
                        ? 'border-pink-500 bg-black'
                        : 'border-zinc-600 bg-zinc-800'
                    }`}
                  />
                </div>
              </div>

              {/* Option 4: Cash On Delivery (COD) */}
              <div
                onClick={() => setPaymentMethod('COD')}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                  paymentMethod === 'COD'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                    : 'border-white/10 bg-zinc-800/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-white font-bold">Tiền mặt khi nhận hàng (COD)</span>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Thanh toán trực tiếp cho tài xế khi giao đồ ăn
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-[5px] transition-all ${
                      paymentMethod === 'COD'
                        ? 'border-orange-500 bg-black'
                        : 'border-zinc-600 bg-zinc-800'
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* Order Items Preview */}
            <section className="bg-zinc-900 border border-white/5 rounded-3xl p-5 space-y-4">
              <h2 className="text-white font-semibold">Món đã chọn ({getTotalItems()})</h2>
              <div className="divide-y divide-white/5">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-start first:pt-0 last:pb-0">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-xs font-bold text-orange-500 mt-0.5">
                        {item.quantity}x
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-medium">{item.name}</h4>
                        {item.options && item.options.length > 0 && (
                          <p className="text-zinc-400 text-xs mt-0.5">{item.options.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-white text-sm font-medium">
                      {formatVND(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Customer Note / Message for Restaurant & Driver */}
            <section className="bg-zinc-900 border border-white/5 rounded-3xl p-5 space-y-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                Ghi chú cho nhà hàng & tài xế
              </h2>
              <p className="text-xs text-zinc-400">
                Thêm yêu cầu chế biến (ví dụ: ít hành, nước dùng để riêng, không cay) hoặc lưu ý giao hàng
              </p>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Ví dụ: Ít hành lá, nước lèo để riêng, thêm tương ớt..."
                rows={2}
                maxLength={300}
                className="w-full bg-zinc-800/60 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
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
            <section className="bg-zinc-900 border border-white/5 rounded-3xl p-5 space-y-3">
              <h2 className="text-white font-semibold mb-2">Chi tiết thanh toán</h2>
              <div className="flex justify-between text-zinc-400 text-sm">
                <span>Tiền món ăn (Tạm tính)</span>
                <span className="text-zinc-200 font-medium font-mono">{formatVND(subtotal)}</span>
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
              <div className="flex justify-between text-zinc-400 text-sm">
                <span className="flex items-center gap-1.5">
                  Phí giao hàng (Cố định)
                  <span className="text-[10px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded font-semibold border border-orange-500/20">
                    Mặc định
                  </span>
                </span>
                <span className="text-zinc-200 font-medium font-mono">{formatVND(shippingFee)}</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-white font-bold">Tổng thanh toán</span>
                <span className="text-xl font-extrabold text-orange-500 font-mono">{formatVND(total)}</span>
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-md border-t border-white/10 z-20">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-zinc-400 text-xs">
                {paymentMethod === 'WALLET'
                  ? 'Thanh toán qua Ví FoodPay'
                  : paymentMethod === 'VNPAY'
                  ? 'Thanh toán qua Cổng VNPAY QR'
                  : paymentMethod === 'MOMO'
                  ? 'Thanh toán qua Ví MoMo'
                  : 'Thanh toán tiền mặt (COD)'}
              </p>
              <p className="text-xl font-extrabold text-white">{formatVND(total)}</p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !!errorMsg}
              className={`py-3.5 px-8 rounded-2xl font-bold text-white transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                isSubmitting || !!errorMsg
                  ? 'bg-zinc-700 cursor-not-allowed'
                  : paymentMethod === 'WALLET' && !isBalanceSufficient
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : paymentMethod === 'VNPAY'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
                  : paymentMethod === 'MOMO'
                  ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/25'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý đơn...</span>
                </>
              ) : paymentMethod === 'WALLET' && !isBalanceSufficient ? (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>Nạp tiền & Đặt hàng</span>
                </>
              ) : paymentMethod === 'VNPAY' || paymentMethod === 'MOMO' ? (
                <>
                  <QrCode className="w-5 h-5" />
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
