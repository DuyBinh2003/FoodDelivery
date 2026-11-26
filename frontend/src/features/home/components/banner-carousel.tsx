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
}

const DEFAULT_BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'banner-freeship',
    title: 'Freeship Đơn 0Đ Toàn Thành Phố',
    subtitle: 'Thưởng thức ẩm thực tươi ngon không lo về phí vận chuyển',
    tag: 'ƯU ĐÃI ĐỘC QUYỀN',
    imageUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Khám phá ngay',
    link: '/menu?promo=discount',
  },
  {
    id: 'banner-tea-party',
    title: 'Giảm 50% Tiệc Trà Chiều & Bánh Ngọt',
    subtitle: 'Hơn 200+ thương hiệu trà sữa, cafe và tráng miệng hàng đầu',
    tag: 'FLASH SALE 14H - 17H',
    imageUrl:
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Xem menu trà',
    link: '/menu?category=Tr%C3%A0%20S%E1%BB%AFa',
  },
  {
    id: 'banner-vietnamese',
    title: 'Hương Vị Việt: Cơm Tấm & Bún Phở Chuẩn Vị',
    subtitle: 'Món ngon nóng hổi giao nhanh thần tốc dưới 20 phút',
    tag: 'QUÁN ĐỊA PHƯƠNG',
    imageUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Đặt món ngay',
    link: '/menu?category=C%C6%A1m%20T%E1%BA%A5m',
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
      className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[28/8] max-h-72 rounded-2xl overflow-hidden border border-border group bg-card shadow-sm"
    >
      {slides.map((slide, index) => {
        const isActive = index === currentSlide;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              fill
              priority={index === 0}
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />

            {/* Gradient Overlay for crisp text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" />

            <div className="absolute inset-0 p-5 sm:p-7 md:p-8 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider mb-2 shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  {slide.tag}
                </span>
                <h3 className="font-heading text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight max-w-xl">
                  {slide.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-md hidden sm:block">
                  {slide.subtitle}
                </p>
              </div>

              <div>
                <Link
                  href={slide.link}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark active:scale-95 font-bold text-xs tracking-wide transition-all shadow-md"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={handlePrev}
        aria-label="Slide trước"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-xl bg-black/50 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden sm:flex"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Slide kế tiếp"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-xl bg-black/50 hover:bg-black/75 text-white backdrop-blur-md border border-white/15 transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden sm:flex"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="absolute bottom-3 right-5 z-20 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentSlide(i)}
            aria-label={`Đi tới slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === currentSlide ? 'w-6 bg-primary' : 'w-1.5 bg-white/45 hover:bg-white/75'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
