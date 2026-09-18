import { Suspense } from 'react';
import { getRestaurant, getRestaurantMenu } from '@/features/restaurant/api';
import { RestaurantClient } from '@/features/restaurant/components/restaurant-client';
import { notFound } from 'next/navigation';

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const [restaurant, menuItems] = await Promise.all([
      getRestaurant(id),
      getRestaurantMenu(id),
    ]);

    if (!restaurant) {
      notFound();
    }

    return (
      <RestaurantClient 
        restaurant={restaurant} 
        menuItems={menuItems} 
      />
    );
  } catch (error) {
    console.error('Failed to load restaurant data:', error);
    notFound();
  }
}
