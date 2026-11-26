import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Store, Star, Clock, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import FoodCard from '@/features/menu/components/food-card/food-card';
import type { FoodListProps } from '@/features/menu/components/food-list/types';
import { formatRestaurantReviewMeta } from '@/features/search/utils/menu-catalog.utils';

export default function FoodList({
  items,
  restaurantName,
  restaurantId: propRestaurantId,
  restaurantBannerUrl,
  restaurantRating,
  restaurantTotalReviews,
  restaurantAddress,
  distanceKm,
  mode = 'menu',
  prioritizeFirstItems = 0,
}: FoodListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-3xl border border-border">
        <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-base font-medium">
          Không tìm thấy món ăn nào trong danh mục này.
        </p>
      </div>
    );
  }

  const restaurantId = propRestaurantId || items[0]?.restaurant_id;
  const bannerUrl = restaurantBannerUrl ?? items[0]?.restaurant_banner_url ?? null;
  const ratingVal = restaurantRating ?? items[0]?.restaurant_rating;
  const { ratingLabel, reviewsLabel } = formatRestaurantReviewMeta(
    ratingVal,
    restaurantTotalReviews,
  );
  const etaMinutes =
    distanceKm !== undefined && distanceKm > 0
      ? Math.min(90, Math.max(12, Math.round(10 + (distanceKm / 25) * 60)))
      : null;

  return (
    <section className="bg-card rounded-3xl p-5 sm:p-7 border border-border shadow-xs transition-all duration-300">
      {restaurantName && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-border">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-primary/12 border border-primary/25 flex items-center justify-center shrink-0 overflow-hidden">
              {bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt={restaurantName}
                  fill
                  unoptimized
                  loading="lazy"
                  decoding="async"
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <Store className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-lg sm:text-xl font-extrabold text-foreground tracking-tight hover:text-primary transition-colors">
                  {restaurantId ? (
                    <Link href={`/restaurant/${restaurantId}`}>{restaurantName}</Link>
                  ) : (
                    restaurantName
                  )}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/12 text-primary border border-primary/25">
                  <CheckCircle2 className="w-3 h-3" />
                  Đối tác chính thức
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  {ratingLabel}
                  {reviewsLabel && (
                    <span className="text-muted-foreground font-normal ml-0.5">
                      {reviewsLabel}
                    </span>
                  )}
                </span>

                {etaMinutes !== null && distanceKm !== undefined && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />~{etaMinutes} phút
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)}m`
                        : `${distanceKm.toFixed(1)}km`}
                    </span>
                  </>
                )}

                {restaurantAddress && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 line-clamp-1 max-w-xs sm:max-w-md">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{restaurantAddress}</span>
                    </span>
                  </>
                )}

                <span>•</span>
                <span className="text-foreground/75 font-medium">{items.length} món</span>
              </div>
            </div>
          </div>

          {restaurantId && (
            <Link
              href={`/restaurant/${restaurantId}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/25 transition-all duration-200 shrink-0 group self-start sm:self-auto"
            >
              Xem quán & ưu đãi
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item, index) => (
          <FoodCard
            key={item.id}
            item={item}
            index={index}
            mode={mode}
            priority={index < prioritizeFirstItems}
          />
        ))}
      </div>
    </section>
  );
}
