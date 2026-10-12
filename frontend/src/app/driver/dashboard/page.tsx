import { Metadata } from 'next';
import { DriverDashboard } from '@/features/driver';

export const metadata: Metadata = {
  title: 'Trung tâm Tài Xế - FoodDelivery',
  description: 'Quản lý trạng thái hoạt động, lịch sử cuốc xe, thu nhập và đánh giá của khách hàng.',
};

export default function DriverDashboardPage() {
  return <DriverDashboard />;
}
