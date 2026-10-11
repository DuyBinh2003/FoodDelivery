import type { Metadata } from 'next';
import { PartnerDashboard } from '@/features/restaurant/components/partner/partner-dashboard';

export const metadata: Metadata = {
  title: 'Kênh đối tác | Quản lý nhà hàng & Thực đơn | FoodDelivery',
  description: 'Quản lý trạng thái mở bán, điều chỉnh giá cả món ăn, thêm món mới và danh mục ẩm thực cho nhà hàng của bạn.',
};

export default function PartnerRestaurantPage() {
  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <PartnerDashboard />
    </div>
  );
}
