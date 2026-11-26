import { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { CartClearer } from '@/features/cart';
import { SearchFilters } from '@/features/search/components/SearchFilters';
import { MenuCatalogFeed } from '@/features/menu/components/menu-catalog-feed/menu-catalog-feed';
import {
  getCategories,
  getTags,
  getPaginatedMenuItems,
} from '@/features/search/api';
import { CustomerLayout } from '@/components/layout/customer-layout/customer-layout';

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const [categories, tags] = await Promise.all([
    getCategories(),
    getTags(),
  ]);

  return (
    <CustomerLayout>
      <main className="flex-1 bg-background min-h-screen pb-20">
        <CartClearer />

        {/* Hero Spotlight Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/30 dark:via-background dark:to-background border-b border-border pt-10 pb-12 sm:pt-14 sm:pb-14 px-4 sm:px-6 lg:px-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/10 blur-[100px] pointer-events-none rounded-full" />

          <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/12 border border-primary/25 text-primary text-xs sm:text-sm font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Khám phá hương vị ẩm thực tươi ngon
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight mb-3">
              Hôm Nay Bạn Muốn <span className="text-primary">Ăn Gì?</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm sm:text-base mb-8">
              Hàng ngàn món ngon nóng hổi, giao hàng siêu tốc từ các quán ăn và thương hiệu được yêu thích nhất.
            </p>

            <div className="w-full max-w-3xl">
              <SearchFilters categories={categories} tags={tags} />
            </div>
          </div>
        </section>

        {/* Main Content Area with SSR Page 1 + Client Infinite Lazy Load */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Suspense fallback={<MenuSkeleton />}>
            <MenuSearchResults searchParams={resolvedSearchParams} />
          </Suspense>
        </div>
      </main>
    </CustomerLayout>
  );
}

async function MenuSearchResults({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const sortBy =
    searchParams.sort === 'distance'
      ? ('distance' as const)
      : searchParams.sort === 'rating'
        ? ('rating' as const)
        : undefined;

  const initialResult = await getPaginatedMenuItems({
    q: searchParams.q,
    category: searchParams.category,
    tag: searchParams.tag,
    promo: searchParams.promo,
    radius: searchParams.radius,
    open_only: searchParams.open_only === 'true',
    sort_by: sortBy,
    page: 1,
    limit: 8,
  });

  const filterKey = JSON.stringify({
    q: searchParams.q ?? '',
    category: searchParams.category ?? '',
    tag: searchParams.tag ?? '',
    promo: searchParams.promo ?? '',
    sort: searchParams.sort ?? '',
    radius: searchParams.radius ?? '',
    open_only: searchParams.open_only ?? '',
  });

  return (
    <MenuCatalogFeed
      initialResult={initialResult}
      filterKey={filterKey}
      queryParams={{
        q: searchParams.q,
        category: searchParams.category,
        tag: searchParams.tag,
        promo: searchParams.promo,
        sort: searchParams.sort,
        radius: searchParams.radius,
        open_only: searchParams.open_only === 'true',
      }}
    />
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-14 bg-card rounded-2xl border border-border w-full" />

      {[1, 2].map((sectionId) => (
        <div key={sectionId} className="bg-card rounded-3xl p-6 border border-border">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-2xl" />
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded-md w-44" />
                <div className="h-3.5 bg-muted/70 rounded-md w-28" />
              </div>
            </div>
            <div className="h-9 bg-muted/70 rounded-xl w-32 hidden sm:block" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((itemId) => (
              <div key={itemId} className="h-72 bg-muted/60 rounded-2xl border border-border" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
