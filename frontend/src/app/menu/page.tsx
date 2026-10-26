import { Suspense } from 'react';
import Link from 'next/link';
import { Sparkles, RotateCcw, SearchX } from 'lucide-react';
import { CartClearer } from '@/features/cart';
import { SearchFilters } from '@/features/search/components/SearchFilters';
import { MenuToolbar } from '@/features/search/components/MenuToolbar';
import FoodList from '@/features/menu/components/food-list/food-list';
import { getCategories, getTags, getMenuItems } from '@/features/search/api';
import type { MenuSection } from '@/features/search/types';

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  // Fetch static filter data in parallel (Cached by ISR)
  const [categories, tags] = await Promise.all([
    getCategories(),
    getTags(),
  ]);

  return (
    <main className="flex-1 bg-background min-h-screen pb-20">
      <CartClearer />

      {/* Hero Spotlight Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-950/25 via-zinc-900/50 to-background border-b border-white/[0.06] pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 lg:px-8">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-orange-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs sm:text-sm font-semibold mb-4 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            Khám phá hương vị ẩm thực đỉnh cao
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            Hôm Nay Bạn Muốn <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Ăn Gì?</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl text-sm sm:text-base mb-8">
            Hàng ngàn món ngon nóng hổi, giao hàng siêu tốc từ các quán ăn và thương hiệu được yêu thích nhất.
          </p>

          {/* Reusable Search Filters Component */}
          <div className="w-full max-w-3xl">
            <SearchFilters categories={categories} tags={tags} />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Restaurant sections with Suspense Streaming */}
        <Suspense fallback={<MenuSkeleton />}>
          <MenuSearchResults searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function MenuSearchResults({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const menuData = await getMenuItems(searchParams);

  if (menuData.length === 0) {
    return (
      <div className="py-20 px-4 text-center max-w-md mx-auto flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-500 mb-5 shadow-xl">
          <SearchX className="w-10 h-10 text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Không tìm thấy món ăn nào</h3>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          Rất tiếc, chúng tôi không tìm thấy kết quả phù hợp với tiêu chí tìm kiếm của bạn. Hãy thử đổi từ khóa hoặc khám phá lại toàn bộ menu.
        </p>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />
          Khám phá lại thực đơn
        </Link>
      </div>
    );
  }

  // Calculate totals
  const totalItems = menuData.reduce((acc, section) => acc + section.items.length, 0);
  const totalRestaurants = menuData.length;

  // Client-requested Sorting
  const sort = searchParams.sort;
  const sortedMenuData: MenuSection[] = menuData.map((section) => {
    const itemsCopy = [...section.items];
    if (sort === 'price_asc') {
      itemsCopy.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price_desc') {
      itemsCopy.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === 'name_asc') {
      itemsCopy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    return {
      ...section,
      items: itemsCopy,
    };
  });

  return (
    <div className="space-y-8">
      {/* Result Count and Sort Toolbar */}
      <MenuToolbar totalItems={totalItems} totalRestaurants={totalRestaurants} />

      {/* List of Restaurant Sections */}
      <div className="space-y-10">
        {sortedMenuData.map((section) => (
          <FoodList
            key={section.restaurant}
            items={section.items}
            restaurantName={section.restaurant}
          />
        ))}
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Toolbar skeleton */}
      <div className="h-14 bg-zinc-900/60 rounded-2xl border border-white/5 w-full"></div>

      {/* Restaurant sections skeleton */}
      {[1, 2].map((sectionId) => (
        <div key={sectionId} className="bg-zinc-950/40 rounded-3xl p-6 border border-white/5">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl"></div>
              <div className="space-y-2">
                <div className="h-5 bg-zinc-800 rounded-md w-44"></div>
                <div className="h-3.5 bg-zinc-800/60 rounded-md w-28"></div>
              </div>
            </div>
            <div className="h-9 bg-zinc-800/60 rounded-xl w-32 hidden sm:block"></div>
          </div>

          {/* Cards grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((itemId) => (
              <div key={itemId} className="h-72 bg-zinc-900/40 rounded-2xl border border-white/5"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
