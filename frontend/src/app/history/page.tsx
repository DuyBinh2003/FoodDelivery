import { OrderHistoryList } from '@/features/orders/components/OrderHistoryList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order History - Food Delivery',
  description: 'View your previous orders and reorder your favorites.',
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Order History</h1>
          <p className="text-zinc-400 text-lg">View your previous orders, leave feedback, and quickly reorder your favorites.</p>
        </div>
        <OrderHistoryList />
      </div>
    </div>
  );
}
