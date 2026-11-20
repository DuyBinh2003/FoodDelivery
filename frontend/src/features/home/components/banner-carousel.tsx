'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
  ctaText: string;
  link: string;
  gradient: string;
}

const DEFAULT_BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'banner-freeship',
    title: 'Freeship Đơn 0Đ Toàn Thành Phố',
    subtitle: 'Thưởng thức ẩm thực yêu thích không lo về phí vận chuyển',
    tag: 'ƯU ĐÃI ĐỘC QUYỀN',
    imageUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Khám phá ngay',
    link: '/menu?promo=freeship',
    gradient: 'from-orange-600/90 via-red-600/80 to-transparent',
  },
  {
    id: 'banner-tea-party',
    title: 'Giảm 50% Tiệc Trà Chiều & Bánh Ngọt',
    subtitle: 'Hơn 200+ thương hiệu trà sữa, cafe và tráng miệng hàng đầu',
    tag: 'FLASH SALE 14H - 17H',
    imageUrl:
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Xem menu trà',
    link: '/menu?category=tra-sua',
    gradient: 'from-amber-600/90 via-orange-600/80 to-transparent',
  },
  {
    id: 'banner-vietnamese',
    title: 'Hương Vị Việt: Cơm Tấm & Bún Phở Chuẩn Vị',
    subtitle: 'Món ngon nóng hổi giao nhanh thần tốc dưới 20 phút',
    tag: 'QUÁN ĐỊA PHƯƠNG',
    imageUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Đặt món ngay',
    link: '/menu?category=com',
    gradient: 'from-emerald-700/90 via-teal-700/80 to-transparent',
  },
];

export function BannerCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slides = DEFAULT_BANNER_SLIDES;

  useEffect(() => {
    if (isHovered) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, slides.length]);

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[28/8] max-h-72 rounded-xl overflow-hidden border border-border group bg-card transition-colors"
    >
      {/* Slides Container */}
      {slides.map((slide, index) => {
        const isActive = index === currentSlide;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image */}
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              fill
              priority={index === 0}
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            {/* Slide Content */}
            <div className="absolute inset-0 p-5 sm:p-7 md:p-8 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {slide.tag}
                </span>
                <h3 className="text-lg sm:text-2xl md:text-3xl font-semibold text-foreground tracking-tight leading-tight max-w-xl">
                  {slide.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-md hidden sm:block">
                  {slide.subtitle}
                </p>
              </div>

              <div>
                <Link
                  href={slide.link}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:brightness-105 active:scale-95 font-medium text-xs tracking-wide transition-all shadow-xs"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Slide trước"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden sm:flex"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Slide kế tiếp"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden sm:flex"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 right-5 z-20 flex items-center gap-1">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentSlide(i)}
            aria-label={`Đi tới slide ${i + 1}`}
            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
              i === currentSlide ? 'w-5 bg-primary' : 'w-1 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
