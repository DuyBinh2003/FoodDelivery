import type { Metadata } from 'next';
import OrderTracker from '@/features/orders/components/order-tracker';
import type { Order } from '@/features/orders/types';

export const metadata: Metadata = {
  title: 'Theo dõi đơn hàng | FoodDelivery',
  description: 'Theo dõi trạng thái đơn hàng của bạn theo thời gian thực.',
};

// Server Component — fetch order data (currently using mock)
async function getOrder(id: string): Promise<Order> {
  // TODO: Replace with real fetch from NestJS
  // const res = await fetch(`http://backend:3001/orders/${id}`);
  return {
    id: id,
    customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    restaurant_name: 'Phở Biên Hòa',
    driver_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    total_amount: 145000,
    status: 'PENDING',
    delivery_address: '789 Trần Hưng Đạo, Q5, TP.HCM',
    items: [
      { id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', menu_item_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở Bò Tái', quantity: 2, unit_price: 55000 },
      { id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', menu_item_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Gỏi Cuốn Tôm Thịt', quantity: 1, unit_price: 35000 },
    ],
    created_at: new Date().toISOString(),
  };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);

  return (
    <main className="flex-1 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderTracker order={order} />
      </div>
    </main>
  );
}
