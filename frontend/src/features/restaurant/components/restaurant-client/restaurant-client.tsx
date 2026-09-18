"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCartStore, CartWidget } from '@/features/cart';
import type { MenuItem } from '@/features/menu/types';
import FoodList from '@/features/menu/components/food-list/food-list';
import { AddToCartDialog } from '@/features/restaurant/components/add-to-cart-dialog/add-to-cart-dialog';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { RestaurantClientProps } from './types';

export function RestaurantClient({ restaurant, menuItems }: RestaurantClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const cartRestaurantId = useCartStore((state) => state.restaurantId);
  const clearCart = useCartStore((state) => state.clearCart);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Clear cart if entering a different restaurant
  useEffect(() => {
    if (cartRestaurantId && cartRestaurantId !== restaurant.id) {
      clearCart();
    }
  }, [restaurant.id, cartRestaurantId, clearCart]);

  // Handle ?item= query param
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId) {
      const item = menuItems.find(i => i.id === itemId);
      if (item) {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(null);
    }
  }, [searchParams, menuItems]);

  const handleCloseDialog = () => {
    setSelectedItem(null);
    // Remove query param without refreshing the page
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center">
        <Link 
          href="/menu"
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="ml-2">
          <h1 className="text-xl font-bold text-white line-clamp-1">{restaurant.name}</h1>
          <p className="text-sm text-zinc-400 line-clamp-1">{restaurant.address}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FoodList items={menuItems} mode="restaurant" />
      </div>

      <AddToCartDialog 
        item={selectedItem} 
        restaurantId={restaurant.id}
        isOpen={!!selectedItem} 
        onClose={handleCloseDialog} 
      />

      <CartWidget />
    </div>
  );
}
