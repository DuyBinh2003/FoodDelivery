import type { Metadata } from 'next';
import { SearchFilters } from '@/features/search/components/SearchFilters';
import FoodList from '@/features/menu/components/food-list';
import { getCategories, getTags, getMenuItems } from '@/features/search/api';

export const metadata: Metadata = {
  title: 'Thực đơn | FoodDelivery',
  description: 'Khám phá thực đơn đa dạng từ các nhà hàng nổi tiếng. Đặt món ngon giao tận nơi.',
};

export default async function MenuPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const resolvedSearchParams = await searchParams;

  // Fetch data in parallel
  const [categories, tags, menuData] = await Promise.all([
    getCategories(),
    getTags(),
    getMenuItems(resolvedSearchParams),
  ]);

  return (
    <main className="flex-1 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Thực đơn</h1>
          <p className="text-zinc-400 mb-8">Khám phá các món ngon từ nhà hàng uy tín</p>

          {/* Reusable Search Filters Component */}
          <SearchFilters categories={categories} tags={tags} />
        </div>

        {/* Restaurant sections */}
        <div className="space-y-12">
          {menuData.length > 0 ? (
            menuData.map((section) => (
              <FoodList
                key={section.restaurant}
                items={section.items}
                restaurantName={section.restaurant}
              />
            ))
          ) : (
            <div className="py-20 text-center">
              <p className="text-zinc-400 text-lg">Không tìm thấy món ăn nào phù hợp với tìm kiếm của bạn.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
