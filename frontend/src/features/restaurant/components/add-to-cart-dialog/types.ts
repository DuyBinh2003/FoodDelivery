import type { MenuItem } from '@/features/menu/types';

export interface AddToCartDialogProps {
  item: MenuItem | null;
  restaurantId: string;
  isOpen: boolean;
  onClose: () => void;
}
