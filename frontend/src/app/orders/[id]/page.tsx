import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import OrderTracker from '@/features/orders/components/order-tracker';
import type { Order } from '@/features/orders/types';
import { getOrderById } from '@/features/orders/api/order-api';
import { getOrderPaymentDetails } from '@/features/payment';

export const metadata: Metadata = {
  title: 'Theo dõi đơn hàng | FoodDelivery',
  description: 'Theo dõi trạng thái đơn hàng của bạn theo thời gian thực.',
};

async function getOrder(id: string, authHeaders?: Record<string, string>): Promise<Order> {
  try {
    const realOrder = await getOrderById(id, { headers: authHeaders });
    if (!realOrder) {
      notFound();
    }
    return realOrder;
  } catch (err) {
    console.error(`Could not load order ${id}:`, err);
    notFound();
  }
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const [order, paymentDetails] = await Promise.all([
    getOrder(id, authHeaders),
    getOrderPaymentDetails(id, { headers: authHeaders }),
  ]);

  return (
    <main className="flex-1 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderTracker order={order} paymentDetails={paymentDetails} />
      </div>
    </main>
  );
}
