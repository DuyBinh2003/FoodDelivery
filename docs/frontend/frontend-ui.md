# Frontend UI

Tài liệu mô tả các trang giao diện người dùng (UI) đã triển khai trên Frontend Next.js.

## Các trang hiện có

### 1. Trang chủ (`/`)
- **Loại:** Server Component (Static).
- **Chức năng:** Landing page giới thiệu dự án FoodDelivery với Hero Section, Call-to-Action và Feature Cards.
- **Thiết kế:** Dark theme, gradient accents (Orange → Red), glassmorphism cards.

### 2. Trang Đăng nhập (`/login`)
- **Loại:** Client Component (`"use client"`).
- **Chức năng:** Form đăng nhập bao gồm Email và Password. Hỗ trợ hiện/ẩn mật khẩu, loading state, và thông báo lỗi. Hiện tại dùng mock authentication (email: `customer@fooddelivery.com`, password: `password123`).
- **Pattern kết nối:** Tương lai sẽ dùng **Client-Side Fetching** (Pattern B) gọi đến Auth API của NestJS.

### 3. Trang Thực đơn (`/menu`)
- **Loại:** Server Component (SSR).
- **Chức năng:** Hiển thị danh sách món ăn theo từng nhà hàng dưới dạng Grid. Có thanh tìm kiếm (decorative). Mỗi món ăn hiển thị tên, giá tiền (VND), trạng thái có sẵn, và nút "Thêm vào giỏ".
- **Pattern kết nối:** Sử dụng **React Server Components (RSC) Fetching** (Pattern A). Hiện tại dùng mock data trùng UUID với dữ liệu seed trong Database.
- **Khi kết nối thật:** Thay thế hàm `getMenuItems()` bằng `fetch('http://backend:3001/restaurants/menu')`.

### 4. Trang Theo dõi Đơn hàng (`/orders/[id]`)
- **Loại:** Hybrid (Server Component fetch data + Client Component cho real-time tracking).
- **Chức năng:** Hiển thị thanh tiến trình 5 bước (PENDING → ACCEPTED → COOKING → DELIVERING → COMPLETED) với animation tự động chuyển trạng thái mỗi 4 giây. Bên dưới là thông tin nhà hàng, địa chỉ giao, chi tiết món ăn và tổng tiền.
- **Pattern kết nối:** Tương lai sẽ dùng **WebSockets** (Pattern C) để nhận push event từ Driver Service.

## Dữ liệu mẫu (Seed Data)
Dự án có sẵn migration `init_seed-sample-data` chèn dữ liệu mẫu vào DB (Users, Restaurants, Menu Items, Orders). Chạy `npm run migrate:up` trong thư mục `backend/` để tạo. Chạy task **DB: Reset** để xóa sạch và tạo lại.

## Cấu trúc thư mục Frontend

```
frontend/src/
├── app/
│   ├── globals.css          # Design tokens, dark theme
│   ├── layout.tsx           # Root layout + Sticky Navbar
│   ├── page.tsx             # Trang chủ (Landing)
│   ├── login/page.tsx       # Trang Đăng nhập
│   ├── menu/page.tsx        # Trang Thực đơn
│   └── orders/[id]/page.tsx # Trang Tracking
├── features/
│   ├── auth/components/     # LoginForm
│   ├── menu/
│   │   ├── components/      # FoodCard, FoodList
│   │   └── types/           # MenuItem, Restaurant
│   └── orders/
│       ├── components/      # OrderStepper, OrderTracker
│       └── types/           # Order, OrderStatus
└── lib/
    └── utils.ts             # cn(), formatCurrency()
```
