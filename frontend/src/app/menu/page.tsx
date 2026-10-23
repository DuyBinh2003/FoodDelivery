import { Suspense } from 'react';
import { CartClearer } from '@/features/cart';
import { SearchFilters } from '@/features/search/components/SearchFilters';
import FoodList from '@/features/menu/components/food-list/food-list';
import { getCategories, getTags, getMenuItems } from '@/features/search/api';

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedSearchParams = await searchParams;

  // Fetch static filter data in parallel (Cached by ISR)
  const [categories, tags] = await Promise.all([
    getCategories(),
    getTags(),
  ]);

  return (
    <main className="flex-1 bg-background">
      <CartClearer />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Thực đơn</h1>
          <p className="text-muted-foreground mb-8">Khám phá các món ngon từ nhà hàng uy tín</p>

          {/* Reusable Search Filters Component */}
          <SearchFilters categories={categories} tags={tags} />
        </div>

        {/* Restaurant sections with Suspense Streaming */}
        <Suspense fallback={<MenuSkeleton />}>
          <MenuSearchResults searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function MenuSearchResults({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const menuData = await getMenuItems(searchParams);

  if (menuData.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground text-lg">Không tìm thấy món ăn nào phù hợp với tìm kiếm của bạn.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {menuData.map((section) => (
        <FoodList
          key={section.restaurant}
          items={section.items}
          restaurantName={section.restaurant}
        />
      ))}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      {[1, 2].map((sectionId) => (
        <div key={sectionId}>
          <div className="h-7 bg-muted rounded-lg w-48 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((itemId) => (
              <div key={itemId} className="h-[280px] bg-card rounded-2xl border border-border"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
