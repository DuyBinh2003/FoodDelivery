'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, Smartphone, ShieldCheck, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Footer() {
  const pathname = usePathname();
  const t = useTranslations('footer');

  // Hide Customer Footer on operational App Screens (Admin, Driver Dashboard, Partner Kitchen)
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/driver/dashboard') ||
    pathname?.startsWith('/partner')
  ) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-card/80 text-foreground transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1: Brand & App Badges */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/20">
                <UtensilsCrossed className="w-4.5 h-4.5" />
              </div>
              <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
                Food<span className="text-primary">Delivery</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t('tagline')}
            </p>

            <div className="pt-1 space-y-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                {t('appTitle')}
              </p>
              <p className="text-xs text-muted-foreground">{t('appSubtitle')}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <span>App Store</span>
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary border border-border text-foreground text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span>Google Play</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Column 2: About */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground">
              {t('aboutTitle')}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  {t('aboutLinks.about')}
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-primary transition-colors">
                  {t('aboutLinks.restaurants')}
                </Link>
              </li>
              <li>
                <Link href="/vouchers" className="hover:text-primary transition-colors">
                  {t('aboutLinks.vouchers')}
                </Link>
              </li>
              <li>
                <Link href="/rewards" className="hover:text-primary transition-colors">
                  {t('aboutLinks.rewards')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Partners */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground">
              {t('partnerTitle')}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/register" className="hover:text-primary transition-colors">
                  {t('partnerLinks.becomePartner')}
                </Link>
              </li>
              <li>
                <Link href="/register/restaurant" className="hover:text-primary transition-colors">
                  {t('partnerLinks.merchant')}
                </Link>
              </li>
              <li>
                <Link href="/register/driver" className="hover:text-primary transition-colors">
                  {t('partnerLinks.driver')}
                </Link>
              </li>
              <li>
                <Link href="/partner/restaurant" className="hover:text-primary transition-colors">
                  {t('partnerLinks.partnerPortal')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground">
              {t('supportTitle')}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/history" className="hover:text-primary transition-colors">
                  {t('supportLinks.orders')}
                </Link>
              </li>
              <li>
                <Link href="/profile/addresses" className="hover:text-primary transition-colors">
                  {t('supportLinks.addresses')}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary transition-colors">
                  {t('supportLinks.terms')}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary transition-colors">
                  {t('supportLinks.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{t('copyright')}</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Double-Entry Verified Payments
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              VI / EN
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
