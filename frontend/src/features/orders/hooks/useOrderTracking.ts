import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrderById, cancelOrder } from '@/features/orders/api/order-api';
import type { Order } from '@/features/orders/types';
import toast from 'react-hot-toast';

export const useOrderTracking = (orderId: string, initialData?: Order) => {
  const queryClient = useQueryClient();

  const query = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    initialData,
    refetchInterval: (queryState) => {
      const status = queryState.state.data?.status;
      // Dừng auto-polling khi đơn hàng đã kết thúc (COMPLETED hoặc CANCELLED)
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        return false;
      }
      // Poll mỗi 3 giây khi đơn hàng đang trong quá trình luân chuyển
      return 3000;
    },
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: (updatedOrder) => {
      toast.success('Đã hủy đơn hàng thành công');
      queryClient.setQueryData(['order', orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Không thể hủy đơn hàng lúc này';
      toast.error(message);
    },
  });

  return {
    order: query.data || initialData,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    cancelOrder: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
};
