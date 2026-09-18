import { useState } from 'react';
import { useCartStore } from '../store/useCartStore';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function useCartValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);

  const validateCart = async (): Promise<ValidationResult> => {
    if (!restaurantId || items.length === 0) {
      return { isValid: false, message: 'Giỏ hàng trống' };
    }

    setIsValidating(true);
    try {
      const response = await fetch('/api/orders/validate-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          items: items.map(i => ({
            item_id: i.item_id,
            quantity: i.quantity,
            options: i.options
          }))
        }),
      });

      console.log('Cart validation response:', response);

      if (!response.ok) {
        throw new Error('Không thể kiểm tra giỏ hàng');
      }

      const data = await response.json();
      
      // Check if any item has is_available = false
      const hasUnavailableItems = data.items.some((i: any) => !i.is_available);
      
      if (hasUnavailableItems) {
        return {
          isValid: false,
          message: 'Một số món ăn trong giỏ hàng hiện đã hết hoặc không khả dụng. Vui lòng kiểm tra lại.'
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
  };

  return {
    validateCart,
    isValidating
  };
}
