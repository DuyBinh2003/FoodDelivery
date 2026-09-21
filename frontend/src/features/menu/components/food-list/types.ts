import type { MenuItem } from '@/features/menu/types';

export interface FoodListProps {
  items: MenuItem[];
  restaurantName?: string;
  mode?: 'menu' | 'restaurant';
}
