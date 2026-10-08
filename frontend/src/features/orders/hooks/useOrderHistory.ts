import { useQuery } from '@tanstack/react-query';
import { getOrderHistory } from '@/features/orders/api/order-api';
import { Order } from '@/features/orders/types';

export const useOrderHistory = () => {
  return useQuery<Order[]>({
    queryKey: ['orderHistory'],
    queryFn: getOrderHistory,
  });
};
