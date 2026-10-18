import { useEffect } from 'react';
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
    staleTime: Infinity,
  });

  // Lắng nghe sự kiện thời gian thực qua Server-Sent Events (SSE)
  useEffect(() => {
    if (!orderId) return;

    // Không mở kết nối nếu đơn hàng đã hoàn tất hoặc bị hủy từ đầu
    const currentStatus = queryClient.getQueryData<Order>(['order', orderId])?.status || initialData?.status;
    if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      return;
    }

    const token = typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith('access_token='))
          ?.split('=')[1]
      : undefined;

    const sseUrl = `/api/orders/${orderId}/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data) as Order;
        if (eventData && eventData.id) {
          queryClient.setQueryData(['order', orderId], (prev: Order | undefined) => ({
            ...prev,
            ...eventData,
          }));

          // Đóng stream khi đơn hàng đạt trạng thái cuối
          if (eventData.status === 'COMPLETED' || eventData.status === 'CANCELLED') {
            eventSource.close();
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE order event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Order SSE stream warning or reconnecting:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [orderId, queryClient, initialData?.status]);

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
