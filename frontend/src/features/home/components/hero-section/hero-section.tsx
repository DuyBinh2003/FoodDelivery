'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Search, MapPin, Clock, Star, Store, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/components/providers/locale-provider';
import { useLocationStore } from '@/features/home/store/useLocationStore';
import {
  HERO_TRENDING_KEYWORDS,
  buildMenuSearchHref,
} from '@/features/home/utils/hero-search.utils';
import type { HeroSectionProps } from './types';

export function HeroSection({
  onOpenLocationModal,
  totalRestaurantsCount,
}: HeroSectionProps) {
  const router = useRouter();
  const t = useTranslations('hero');
  const { locale } = useAppLocale();
  const { currentLocation } = useLocationStore();
  const [query, setQuery] = useState('');

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 48]);
  const badgeY = useTransform(scrollYProgress, [0, 1], [0, -24]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildMenuSearchHref(query));
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-50 via-background to-lime-50/70 dark:from-emerald-950/35 dark:via-card dark:to-background p-6 sm:p-8 lg:p-12 shadow-sm"
    >
      {/* Subtle decorative radial accent */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Copy, Search, Popular Tags, Stats */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-5"
        >
          {/* Promo Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 border border-primary/25 px-3.5 py-1.5 text-xs font-bold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('badge')}</span>
          </div>

          {/* Display Headline */}
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
            {t('titleStart')}{' '}
            <span className="text-primary">{t('titleHighlight')}</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            {t('subtitle')}
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl bg-card border border-border shadow-md shadow-primary/5"
          >
            {onOpenLocationModal && (
              <button
                type="button"
                onClick={onOpenLocationModal}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/70 hover:bg-secondary text-left text-xs font-medium text-foreground sm:max-w-[190px] shrink-0 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{currentLocation.address}</span>
              </button>
            )}

            <div className="relative flex-1 flex items-center">
              <Search className="w-4.5 h-4.5 text-muted-foreground absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-bold text-sm shadow-sm shadow-primary/25 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <span>{t('searchButton')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Popular Keywords */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {t('popularLabel')}
            </span>
            {HERO_TRENDING_KEYWORDS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(buildMenuSearchHref(item.query))}
                className="px-3 py-1 rounded-full bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border text-xs font-semibold text-foreground/80 transition-colors cursor-pointer"
              >
                {locale === 'en' ? item.labelEn : item.labelVi}
              </button>
            ))}
          </div>

          {/* Trust Stats */}
          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Store className="w-4 h-4 text-primary" />
              {totalRestaurantsCount && totalRestaurantsCount > 0
                ? `${totalRestaurantsCount}+ ${locale === 'en' ? 'Active Kitchens' : 'Quán đang mở'}`
                : t('statRestaurants')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              {t('statDelivery')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              {t('statRating')}
            </span>
          </div>
        </motion.div>

        {/* Right Column: Parallax Food Visual */}
        <motion.div
          style={{ y: imageY }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 relative"
        >
          <div className="relative aspect-[4/3] lg:aspect-[5/4] w-full rounded-3xl overflow-hidden border border-border shadow-xl bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=85"
              alt="Fresh healthy food bowl delivered fast"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Floating Live Delivery Card */}
            <motion.div
              style={{ y: badgeY }}
              className="absolute bottom-4 left-4 right-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border p-3.5 shadow-lg flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-foreground truncate">
                    {locale === 'en' ? 'Express Courier Dispatch' : 'Điều phối tài xế siêu tốc'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {locale === 'en'
                      ? 'Live GPS route • Freeship deals daily'
                      : 'Định vị GPS trực tiếp • Freeship mỗi ngày'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
                15-20m
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
