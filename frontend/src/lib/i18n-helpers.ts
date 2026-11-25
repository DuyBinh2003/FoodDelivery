export type SupportedLocale = 'vi' | 'en';

export const DEFAULT_LOCALE: SupportedLocale = 'vi';
export const LOCALE_STORAGE_KEY = 'fd-locale';

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  shortLabel: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VI', flag: 'VN' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: 'EN' },
];

/**
 * Normalize an incoming locale value to a supported locale ('vi' or 'en').
 */
export function resolveLocale(raw: string | null | undefined): SupportedLocale {
  if (!raw || typeof raw !== 'string') return DEFAULT_LOCALE;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (normalized === 'vi' || normalized.startsWith('vi-')) {
    return 'vi';
  }
  return DEFAULT_LOCALE;
}

/**
 * Return the next locale when toggling between VI and EN.
 */
export function getNextLocale(current: SupportedLocale): SupportedLocale {
  return current === 'vi' ? 'en' : 'vi';
}
