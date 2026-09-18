"use client";

import { useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';

export function CartClearer() {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
