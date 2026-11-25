export interface HeroTrendingKeyword {
  id: string;
  labelVi: string;
  labelEn: string;
  query: string;
}

export const HERO_TRENDING_KEYWORDS: HeroTrendingKeyword[] = [
  { id: 'pho', labelVi: 'Phở bò', labelEn: 'Beef Pho', query: 'Phở bò' },
  { id: 'com-tam', labelVi: 'Cơm tấm', labelEn: 'Broken Rice', query: 'Cơm tấm' },
  { id: 'tra-sua', labelVi: 'Trà sữa', labelEn: 'Milk Tea', query: 'Trà sữa' },
  { id: 'bun-bo', labelVi: 'Bún bò Huế', labelEn: 'Hue Beef Noodle', query: 'Bún bò Huế' },
  { id: 'ga-ran', labelVi: 'Gà rán', labelEn: 'Fried Chicken', query: 'Gà rán' },
  { id: 'banh-mi', labelVi: 'Bánh mì', labelEn: 'Banh Mi', query: 'Bánh mì' },
];

/**
 * Build `/menu` search URL from raw search input safely.
 * Returns `/menu` if query is empty or whitespace-only.
 */
export function buildMenuSearchHref(rawQuery: string | null | undefined): string {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return '/menu';
  }
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return '/menu';
  }
  return `/menu?q=${encodeURIComponent(trimmed)}`;
}
