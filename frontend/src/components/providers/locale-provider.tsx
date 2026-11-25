'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import viMessages from '../../../messages/vi.json';
import enMessages from '../../../messages/en.json';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getNextLocale,
  resolveLocale,
  type SupportedLocale,
} from '@/lib/i18n-helpers';

const MESSAGES_MAP: Record<SupportedLocale, typeof viMessages> = {
  vi: viMessages,
  en: enMessages,
};

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      const resolved = resolveLocale(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(resolved);
      document.documentElement.lang = resolved;
    } catch (err: unknown) {
      console.warn('[LocaleProvider] Unable to read saved locale:', err);
    }
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch (err: unknown) {
      console.warn('[LocaleProvider] Unable to persist locale:', err);
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = getNextLocale(prev);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next;
      }
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch (err: unknown) {
        console.warn('[LocaleProvider] Unable to persist locale:', err);
      }
      return next;
    });
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES_MAP[locale]}
        timeZone="Asia/Ho_Chi_Minh"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useAppLocale() {
  return useContext(LocaleContext);
}
