import type { MenuItem } from '@/features/menu/types';

export interface FoodListProps {
  items: MenuItem[];
  restaurantName?: string;
  restaurantId?: string;
  restaurantBannerUrl?: string | null;
  restaurantRating?: number;
  restaurantTotalReviews?: number;
  restaurantAddress?: string | null;
  distanceKm?: number;
  mode?: 'menu' | 'restaurant';
  prioritizeFirstItems?: number;
}
