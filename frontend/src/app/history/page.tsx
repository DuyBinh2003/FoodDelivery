import { OrderHistoryList } from '@/features/orders/components/OrderHistoryList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order History - Food Delivery',
  description: 'View your previous orders and reorder your favorites.',
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1.5">Lịch sử đơn hàng</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Xem lại các đơn hàng đã đặt, gửi đánh giá phản hồi và đặt lại món yêu thích nhanh chóng.</p>
        </div>
        <OrderHistoryList />
      </div>
    </div>
  );
}
