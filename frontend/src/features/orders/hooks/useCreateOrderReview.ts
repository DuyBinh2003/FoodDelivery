import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrderReview } from '@/features/orders/api/order-api';
import { CreateOrderReviewDto } from '@/features/orders/types';

export const useCreateOrderReview = (orderId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderReviewDto) => createOrderReview(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
};
