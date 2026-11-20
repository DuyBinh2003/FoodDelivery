export interface CartItemLike {
  id: string;
  name: string;
  quantity: number;
}

export interface OutOfStockResolution<T extends CartItemLike> {
  validItems: T[];
  depletedItems: T[];
  toastMessage: string;
  hasDepleted: boolean;
}

/**
 * Xử lý xung đột khi món ăn bị hết hàng tại bước Checkout
 */
export function handleOutOfStockConflict<T extends CartItemLike>(
  cartItems: T[],
  outOfStockItemIds: string[],
): OutOfStockResolution<T> {
  const depletedSet = new Set(outOfStockItemIds);
  const validItems: T[] = [];
  const depletedItems: T[] = [];

  for (const item of cartItems) {
    if (depletedSet.has(item.id)) {
      depletedItems.push(item);
    } else {
      validItems.push(item);
    }
  }

  const hasDepleted = depletedItems.length > 0;
  let toastMessage = '';

  if (hasDepleted) {
    const itemNames = depletedItems.map((i) => `"${i.name}"`).join(', ');
    toastMessage = `Món ${itemNames} vừa hết hàng do lượng đặt tăng đột biến. Giỏ hàng đã được tự động cập nhật.`;
  }

  return {
    validItems,
    depletedItems,
    toastMessage,
    hasDepleted,
  };
}

