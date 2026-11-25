import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

interface CartItemProps {
  id: string;
}

export const CartItem: React.FC<CartItemProps> = ({ id }) => {
  const item = useCartStore((state) => state.items.find((i) => i.id === id));
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  if (!item) return null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/60">
      <div className="flex-1 min-w-0 pr-4">
        <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
        {item.options && item.options.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.options.join(', ')}
          </p>
        )}
        <div className="text-sm font-semibold text-primary mt-1 font-mono tabular-nums">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-muted rounded-full border border-border">
          <button 
            onClick={() => updateQuantity(id, -1)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-6 text-center text-sm text-foreground font-medium tabular-nums">
            {item.quantity}
          </span>
          <button 
            onClick={() => updateQuantity(id, 1)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <button 
          onClick={() => removeItem(id)}
          className="p-1.5 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
