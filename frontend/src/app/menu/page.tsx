import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import FoodList from '@/features/menu/components/food-list';
import type { MenuItem } from '@/features/menu/types';

export const metadata: Metadata = {
  title: 'Thực đơn | FoodDelivery',
  description: 'Khám phá thực đơn đa dạng từ các nhà hàng nổi tiếng. Đặt món ngon giao tận nơi.',
};

// Server Component — fetch data from NestJS (currently using mock data)
async function getMenuItems(): Promise<{ restaurant: string; items: MenuItem[] }[]> {
  // TODO: Replace with real fetch from NestJS when backend Restaurant Service is ready
  // const res = await fetch('http://backend:3001/restaurants/menu', { next: { revalidate: 60 } });
  return [
    {
      restaurant: 'Phở Biên Hòa',
      items: [
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở Bò Tái', price: 55000, is_available: true, restaurant_name: 'Phở Biên Hòa' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở Bò Chín', price: 55000, is_available: true, restaurant_name: 'Phở Biên Hòa' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở Gà', price: 50000, is_available: true, restaurant_name: 'Phở Biên Hòa' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Gỏi Cuốn Tôm Thịt', price: 35000, is_available: true, restaurant_name: 'Phở Biên Hòa' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Nước Chanh Dây', price: 25000, is_available: true, restaurant_name: 'Phở Biên Hòa' },
      ],
    },
    {
      restaurant: 'Bún Bò Huế Đông Ba',
      items: [
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bún Bò Đặc Biệt', price: 65000, is_available: true, restaurant_name: 'Bún Bò Huế Đông Ba' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bún Bò Giò Heo', price: 70000, is_available: true, restaurant_name: 'Bún Bò Huế Đông Ba' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bún Bò Chả Cua', price: 75000, is_available: false, restaurant_name: 'Bún Bò Huế Đông Ba' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Chả Lụa Huế', price: 30000, is_available: true, restaurant_name: 'Bún Bò Huế Đông Ba' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', restaurant_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Trà Đá', price: 5000, is_available: true, restaurant_name: 'Bún Bò Huế Đông Ba' },
      ],
    },
  ];
}

export default async function MenuPage() {
  const menuData = await getMenuItems();

  return (
    <main className="flex-1 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Thực đơn</h1>
          <p className="text-zinc-400 mt-2">Khám phá các món ngon từ nhà hàng uy tín</p>

          {/* Search bar (decorative) */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200"
            />
          </div>
        </div>

        {/* Restaurant sections */}
        <div className="space-y-12">
          {menuData.map((section) => (
            <FoodList
              key={section.restaurant}
              items={section.items}
              restaurantName={section.restaurant}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
