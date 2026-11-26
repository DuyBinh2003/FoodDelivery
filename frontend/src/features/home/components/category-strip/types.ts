import type { HomeCategoryItem } from '@/features/home/utils/home-feed.utils';

export interface CategoryStripProps {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  categories?: HomeCategoryItem[];
}
