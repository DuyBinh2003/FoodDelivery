import { OrderHistoryList } from '@/features/orders/components/OrderHistoryList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order History - Food Delivery',
  description: 'View your previous orders and reorder your favorites.',
};

export default function HistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Order History</h1>
      <OrderHistoryList />
    </div>
  );
}
