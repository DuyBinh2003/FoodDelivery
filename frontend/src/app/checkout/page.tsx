import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, CartItem } from '@/features/cart';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';
import { MapPin, ChevronLeft, CreditCard, Clock, AlertCircle } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, getTotalItems, clearCart } = useCartStore();
  const { validateCart, isValidating } = useCartValidation();
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validatedItems, setValidatedItems] = useState<any[] | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkCart = async () => {
      if (items.length === 0) {
        if (mounted) router.push('/menu');
        return;
      }
      
      const result = await validateCart();
      if (!mounted) return;

      if (!result.isValid) {
        setErrorMsg(result.message || 'Lỗi kiểm tra giỏ hàng.');
      }
    };

    checkCart();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = getSubtotal();
  const shippingFee = 15000; // Fixed fake shipping fee
  const total = subtotal + shippingFee;

  const handlePlaceOrder = () => {
    // Fake placing order
    setIsSuccess(true);
    setTimeout(() => {
      clearCart();
      router.push('/menu');
    }, 3000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Đặt hàng thành công!</h1>
        <p className="text-zinc-400">Đơn hàng của bạn đang được xử lý.</p>
        <p className="text-sm text-zinc-500 mt-1">Đang quay lại trang chủ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white ml-2">Thanh toán</h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {isValidating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-400">Đang kiểm tra giỏ hàng...</p>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{errorMsg}</p>
              </div>
            )}

            {/* Delivery Info */}
            <section className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                Giao hàng đến
              </h2>
              <div className="bg-zinc-800/50 rounded-xl p-3">
                <p className="text-white font-medium">Nguyễn Văn A • 0901234567</p>
                <p className="text-zinc-400 text-sm mt-1">Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM</p>
              </div>
            </section>

            {/* Order Items */}
            <section className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
              <h2 className="text-white font-semibold mb-4">Món đã chọn ({getTotalItems()})</h2>
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-sm font-medium text-orange-500 mt-0.5">
                        {item.quantity}x
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{item.name}</h4>
                        {item.options && item.options.length > 0 && (
                          <p className="text-zinc-400 text-xs mt-0.5">{item.options.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-white font-medium">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-500" />
                Phương thức thanh toán
              </h2>
              <div className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-3 border border-orange-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center">
                    💵
                  </div>
                  <span className="text-white font-medium">Tiền mặt (COD)</span>
                </div>
                <div className="w-5 h-5 rounded-full border-[5px] border-orange-500 bg-zinc-900" />
              </div>
            </section>

            {/* Summary */}
            <section className="bg-zinc-900 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-zinc-400 text-sm">
                <span>Tạm tính</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-sm">
                <span>Phí giao hàng</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-white font-semibold">Tổng cộng</span>
                <span className="text-xl font-bold text-orange-500">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                </span>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Bottom Bar */}
      {!isValidating && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/90 backdrop-blur-md border-t border-white/10">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-zinc-400 text-sm">Tổng thanh toán</p>
              <p className="text-xl font-bold text-white">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
              </p>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={!!errorMsg}
              className={`py-3.5 px-8 rounded-xl font-semibold text-white transition-colors ${
                errorMsg 
                  ? 'bg-zinc-700 cursor-not-allowed' 
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              Đặt hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
