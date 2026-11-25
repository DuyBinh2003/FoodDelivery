import { OrderHistoryList } from '@/features/orders/components/OrderHistoryList';
import { CustomerLayout } from '@/components/layout/customer-layout/customer-layout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lịch sử đơn hàng - FoodDelivery',
  description: 'Xem lại các đơn hàng đã đặt, theo dõi tiến trình và đặt lại món yêu thích nhanh chóng.',
};

export default function HistoryPage() {
  return (
    <CustomerLayout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-1.5">
              Lịch sử đơn hàng
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Xem lại các đơn hàng đã đặt, gửi đánh giá phản hồi và đặt lại món yêu thích nhanh chóng.
            </p>
          </div>
          <OrderHistoryList />
        </div>
      </div>
    </CustomerLayout>
  );
}
