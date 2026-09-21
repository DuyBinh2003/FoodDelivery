import type { MenuItem } from '@/features/menu/types';

export interface FoodCardProps {
  item: MenuItem;
  index: number;
  mode?: 'menu' | 'restaurant';
}
