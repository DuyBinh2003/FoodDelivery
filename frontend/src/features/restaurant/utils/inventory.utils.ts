export interface InventoryBadgeInfo {
  label: string;
  isOutOfStock: boolean;
  isLowStock: boolean;
  badgeClass: string;
}

export interface StockValidationResult {
  canAdd: boolean;
  error?: string;
  maxAllowed?: number;
}

/**
 * Trả về thông tin hiển thị Badge tồn kho thời gian thực
 */
export function getInventoryStatusBadge(stock?: number | null): InventoryBadgeInfo {
  if (stock === undefined || stock === null) {
    return {
      label: 'Còn hàng',
      isOutOfStock: false,
      isLowStock: false,
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }

  if (stock <= 0) {
    return {
      label: 'Đã hết hàng',
      isOutOfStock: true,
      isLowStock: false,
      badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
    };
  }

  if (stock <= 5) {
    return {
      label: `Chỉ còn ${stock} suất`,
      isOutOfStock: false,
      isLowStock: true,
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse',
    };
  }

  return {
    label: 'Còn hàng',
    isOutOfStock: false,
    isLowStock: false,
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };
}

/**
 * Xác thực tồn kho trước khi người dùng bấm thêm vào giỏ hàng
 */
export function validateItemStockBeforeAdd(
  stock: number | undefined | null,
  requestedQuantity: number,
  itemName = 'Món ăn',
): StockValidationResult {
  if (requestedQuantity <= 0) {
    return { canAdd: false, error: 'Số lượng phải lớn hơn 0' };
  }

  if (stock === undefined || stock === null) {
    return { canAdd: true };
  }

  if (stock <= 0) {
    return {
      canAdd: false,
      error: `"${itemName}" hiện đã hết hàng, vui lòng chọn món khác.`,
      maxAllowed: 0,
    };
  }

  if (requestedQuantity > stock) {
    return {
      canAdd: false,
      error: `Chỉ còn lại ${stock} suất "${itemName}". Vui lòng giảm số lượng.`,
      maxAllowed: stock,
    };
  }

  return { canAdd: true, maxAllowed: stock };
}

