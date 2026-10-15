import { useState, useCallback } from 'react';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { validateCartApi } from '@/features/cart/api/cart-api';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function useCartValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);

  const validateCart = useCallback(async (): Promise<ValidationResult> => {
    if (!restaurantId || items.length === 0) {
      return { isValid: false, message: 'Giỏ hàng trống' };
    }

    setIsValidating(true);
    try {
      const data = await validateCartApi({
        restaurant_id: restaurantId,
        items: items.map(i => ({
          item_id: i.item_id,
          quantity: i.quantity,
          options: i.options,
        }))
      });
      
      if (!data.isValid || (data.invalidItems && data.invalidItems.length > 0)) {
        const errorReason = data.reason || data.invalidItems?.[0]?.reason || 'Một số món ăn trong giỏ hàng hiện đã hết hoặc không khả dụng. Vui lòng kiểm tra lại.';
        return {
          isValid: false,
          message: errorReason,
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Cart validation error:', error);
      return {
        isValid: false,
        message: 'Đã xảy ra lỗi khi kiểm tra giỏ hàng. Vui lòng thử lại sau.'
      };
    } finally {
      setIsValidating(false);
    }
  }, [restaurantId, items]);

  return {
    validateCart,
    isValidating
  };
}
