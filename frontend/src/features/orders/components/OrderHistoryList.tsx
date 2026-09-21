'use client';

import React, { useState } from 'react';
import { useOrderHistory } from '@/features/orders/hooks/useOrderHistory';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderReviewModal } from '@/features/orders/components/OrderReviewModal';
import { Order, OrderItem, OrderStatus } from '@/features/orders/types';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusColors: Record<OrderStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    COOKING: 'bg-purple-100 text-purple-800',
    DELIVERING: 'bg-indigo-100 text-indigo-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return <Badge className={`${statusColors[status]} hover:${statusColors[status]} border-0 shadow-none`}>{status}</Badge>;
};

export const OrderHistoryList = () => {
  const { data: orders, isLoading, error } = useOrderHistory();
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const router = useRouter();
  
  const setCartItems = useCartStore((state) => state.setItems);
  const { validateCart } = useCartValidation();

  if (isLoading) return <div className="p-8 text-center">Loading orders...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load history</div>;
  if (!orders || orders.length === 0) return <div className="p-8 text-center text-gray-500">No previous orders found.</div>;

  const handleReorder = async (order: Order) => {
    // Tái tạo lại giỏ hàng từ order.items
    const cartItems = order.items.map((item: OrderItem) => ({
      id: item.menu_item_id || item.id, // ID unique trong giỏ
      item_id: item.menu_item_id, // ID thật của món
      name: item.name || 'Menu Item',
      price: Number(item.unit_price),
      quantity: item.quantity,
    }));

    // Cập nhật local state giỏ hàng
    setCartItems(cartItems, order.restaurant_id);

    // Gọi API validate
    const res = await validateCart();
    if (res.isValid) {
      router.push('/checkout');
    } else {
      alert(res.message || 'Có lỗi xảy ra khi xác thực giỏ hàng.');
      router.push('/checkout'); // Chuyển đến checkout để user xem lỗi
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between bg-gray-50 pb-4">
            <div>
              <CardTitle className="text-lg text-primary">{order.restaurant_name || 'Restaurant'}</CardTitle>
              <div className="text-sm text-gray-500 mt-1">
                {new Date(order.created_at).toLocaleString('vi-VN')}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{item.quantity}x {item.name || 'Item'}</span>
                  <span className="text-gray-600">{Number(item.unit_price).toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
              <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            
            {order.review && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                <p className="font-semibold mb-1 flex gap-2">
                  <span>Your Review: </span>
                  <span className="text-yellow-500">{'★'.repeat(order.review.restaurant_rating || 0)}</span>
                </p>
                <p className="italic">&quot;{order.review.comment}&quot;</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-white border-t flex justify-end gap-3 pt-4">
            {order.status === 'COMPLETED' && !order.review && (
              <Button variant="outline" onClick={() => setReviewOrderId(order.id)}>
                Leave a Review
              </Button>
            )}
            <Button onClick={() => handleReorder(order)}>
              Reorder
            </Button>
          </CardFooter>
        </Card>
      ))}

      <OrderReviewModal 
        isOpen={!!reviewOrderId} 
        orderId={reviewOrderId!} 
        onClose={() => setReviewOrderId(null)} 
      />
    </div>
  );
};
