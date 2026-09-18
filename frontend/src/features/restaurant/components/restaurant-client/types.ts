import type { Restaurant, MenuItem } from '@/features/menu/types';

export interface RestaurantClientProps {
  restaurant: Restaurant;
  menuItems: MenuItem[];
}
