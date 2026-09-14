import type { Metadata } from 'next';
import { SearchFilters } from '@/features/search/components/SearchFilters';
import FoodList from '@/features/menu/components/food-list';
import type { MenuItem } from '@/features/menu/types';

export const metadata: Metadata = {
  title: 'Thực đơn | FoodDelivery',
  description: 'Khám phá thực đơn đa dạng từ các nhà hàng nổi tiếng. Đặt món ngon giao tận nơi.',
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Server Component — fetch data from NestJS
async function getCategories() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/search/categories`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch categories', e);
    return [];
  }
}

async function getTags() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/search/tags`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch tags', e);
    return [];
  }
}

async function getMenuItems(searchParams?: { [key: string]: string | undefined }): Promise<{ restaurant: string; items: MenuItem[] }[]> {
  try {
    const params = new URLSearchParams();
    if (searchParams?.q) params.set('q', searchParams.q);
    if (searchParams?.category) params.set('category', searchParams.category);
    if (searchParams?.tag) params.set('tag', searchParams.tag);

    const url = `${BACKEND_URL}/api/search/menu?${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch menu items', e);
    return [];
  }
}

export default async function MenuPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const resolvedSearchParams = await searchParams;
  
  // Fetch data in parallel
  const [categories, tags, menuData] = await Promise.all([
    getCategories(),
    getTags(),
    getMenuItems(resolvedSearchParams)
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
