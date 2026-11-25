export type ThemeMode = 'light' | 'dark';

export const DEFAULT_THEME_MODE: ThemeMode = 'light';
export const THEME_STORAGE_KEY = 'fd-theme-mode';

export interface ThemePaletteTokens {
  primaryOklch: string;
  primaryDarkHex: string;
  backgroundOklch: string;
  foregroundOklch: string;
  accentOklch: string;
}

export const FRESH_GREEN_LIGHT_TOKENS: ThemePaletteTokens = {
  primaryOklch: 'oklch(0.55 0.18 145)',
  primaryDarkHex: '#16a34a',
  backgroundOklch: 'oklch(0.99 0 0)',
  foregroundOklch: 'oklch(0.12 0.015 145)',
  accentOklch: 'oklch(0.72 0.19 85)',
};

export const FRESH_GREEN_DARK_TOKENS: ThemePaletteTokens = {
  primaryOklch: 'oklch(0.62 0.20 145)',
  primaryDarkHex: '#22c55e',
  backgroundOklch: 'oklch(0.11 0.01 145)',
  foregroundOklch: 'oklch(0.98 0 0)',
  accentOklch: 'oklch(0.74 0.18 85)',
};

/**
 * Resolve stored theme string safely; falls back to 'light' default.
 */
export function resolveThemeMode(raw: string | null | undefined): ThemeMode {
  if (raw === 'dark') return 'dark';
  if (raw === 'light') return 'light';
  return DEFAULT_THEME_MODE;
}

/**
 * Toggle between light and dark theme modes.
 */
export function getNextThemeMode(current: ThemeMode): ThemeMode {
  return current === 'light' ? 'dark' : 'light';
}
