import FoodCard from '@/features/menu/components/food-card';
import type { MenuItem } from '@/features/menu/types';

interface FoodListProps {
  items: MenuItem[];
  restaurantName?: string;
}

export default function FoodList({ items, restaurantName }: FoodListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 text-lg">Không tìm thấy món ăn nào.</p>
      </div>
    );
  }

  return (
    <div>
      {restaurantName && (
        <h2 className="text-xl font-bold text-white mb-4">{restaurantName}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item, index) => (
          <FoodCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
