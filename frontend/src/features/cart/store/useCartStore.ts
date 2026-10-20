import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  price: number;
}

export interface CartItemType {
  id: string; // unique id combining item_id and options string
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  options?: string[];
  selected_modifiers?: SelectedModifier[];
  note?: string;
}

export interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItemType[];
  addItem: (item: CartItemType, restaurantId: string, restaurantName?: string) => boolean;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
  setItems: (items: CartItemType[], restaurantId: string, restaurantName?: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],

      addItem: (item, restaurantId, restaurantName) => {
        const state = get();

        // Single Restaurant Policy: check if cart already has items from another restaurant
        if (state.restaurantId && state.items.length > 0 && state.restaurantId !== restaurantId) {
          // Returning false indicates we need to show a confirmation dialog
          // to clear the cart before adding this item.
          return false;
        }

        set((prevState) => {
          const existingItemIndex = prevState.items.findIndex((i) => i.id === item.id);

          if (existingItemIndex >= 0) {
            // Item with identical customization exists, increase quantity
            const newItems = [...prevState.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return {
              items: newItems,
              restaurantId,
              restaurantName: restaurantName || prevState.restaurantName,
            };
          }

          // New item or item with distinct options
          return {
            items: [...prevState.items, item],
            restaurantId,
            restaurantName: restaurantName || prevState.restaurantName,
          };
        });

        return true;
      },

      removeItem: (id) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== id);
          const hasRemainingItems = newItems.length > 0;
          return {
            items: newItems,
            restaurantId: hasRemainingItems ? state.restaurantId : null,
            restaurantName: hasRemainingItems ? state.restaurantName : null,
          };
        });
      },

      updateQuantity: (id, delta) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex((i) => i.id === id);
          if (existingItemIndex < 0) return state;

          const newItems = [...state.items];
          const item = newItems[existingItemIndex];
          const newQuantity = item.quantity + delta;

          if (newQuantity <= 0) {
            newItems.splice(existingItemIndex, 1);
          } else {
            item.quantity = newQuantity;
          }

          const hasRemainingItems = newItems.length > 0;
          return {
            items: newItems,
            restaurantId: hasRemainingItems ? state.restaurantId : null,
            restaurantName: hasRemainingItems ? state.restaurantName : null,
          };
        });
      },

      clearCart: () => {
        set({ items: [], restaurantId: null, restaurantName: null });
      },

      setItems: (items, restaurantId, restaurantName) => {
        set({
          items,
          restaurantId,
          restaurantName: restaurantName || null,
        });
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'food_delivery_cart_storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
