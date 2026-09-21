import { getRestaurant, getRestaurantMenu } from '@/features/restaurant/api';
import { RestaurantClient } from '@/features/restaurant/components/restaurant-client/restaurant-client';
import { notFound } from 'next/navigation';

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let data;
  try {
    const [restaurant, menuItems] = await Promise.all([
      getRestaurant(id),
      getRestaurantMenu(id),
    ]);
    data = { restaurant, menuItems };
  } catch (error) {
    console.error('Failed to load restaurant data:', error);
    notFound();
  }

  if (!data?.restaurant) {
    notFound();
  }

  return (
    <RestaurantClient 
      restaurant={data.restaurant} 
      menuItems={data.menuItems} 
    />
  );
}
