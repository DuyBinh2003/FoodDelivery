import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItemType {
  id: string; // unique id combining item_id and options string
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  options?: string[];
}

export interface CartState {
  restaurantId: string | null;
  items: CartItemType[];
  addItem: (item: CartItemType, restaurantId: string) => boolean;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      items: [],
      
      addItem: (item, restaurantId) => {
        const state = get();
        
        // Single Restaurant Policy
        if (state.restaurantId && state.restaurantId !== restaurantId) {
          // Returning false indicates we need to show a confirmation dialog
          // to clear the cart before adding this item.
          return false;
        }

        set((state) => {
          const existingItemIndex = state.items.findIndex(i => i.id === item.id);
          
          if (existingItemIndex >= 0) {
            // Item exists, increase quantity
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return { items: newItems, restaurantId };
          }
          
          // New item
          return {
            items: [...state.items, item],
            restaurantId
          };
        });
        
        return true;
      },
      
      removeItem: (id) => {
        set((state) => {
          const newItems = state.items.filter(i => i.id !== id);
          return {
            items: newItems,
            restaurantId: newItems.length === 0 ? null : state.restaurantId
          };
        });
      },
      
      updateQuantity: (id, delta) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(i => i.id === id);
          if (existingItemIndex < 0) return state;
          
          const newItems = [...state.items];
          const item = newItems[existingItemIndex];
          const newQuantity = item.quantity + delta;
          
          if (newQuantity <= 0) {
            newItems.splice(existingItemIndex, 1);
          } else {
            item.quantity = newQuantity;
          }
          
          return {
            items: newItems,
            restaurantId: newItems.length === 0 ? null : state.restaurantId
          };
        });
      },
      
      clearCart: () => {
        set({ items: [], restaurantId: null });
      },
      
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      }
    }),
    {
      name: 'food-delivery-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
