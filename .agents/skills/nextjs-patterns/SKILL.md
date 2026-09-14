---
name: nextjs-patterns
description: Next.js frontend architecture and structure conventions for FoodDelivery. Use this skill when building, refactoring, or modifying the Next.js frontend application.
---

# Next.js Architecture Patterns (Frontend)

Mọi thao tác code trên Frontend (Next.js) của dự án FoodDelivery phải tuân thủ nghiêm ngặt các quy tắc kiến trúc sau:

## 1. Cấu trúc thư mục (Directory Structure)
Sử dụng kiến trúc **Feature-Based Design** (đóng gói theo tính năng) kết hợp với **App Router** để dự án dễ dàng mở rộng (scale) khi số lượng module tăng (FoodDelivery có nhiều nhóm người dùng: User, Driver, Admin, Restaurant).

Mô hình thư mục chuẩn:
```
frontend/src/
├── app/                  # (App Router) Chỉ dùng cho Routing, Route Handlers, Layout và Pages.
├── components/           # (UI/Shared) Các UI Component dùng chung (Button, Modal, Input, Design System).
├── features/             # Nơi chứa toàn bộ logic nghiệp vụ (domain logic) đóng gói theo tính năng.
│   ├── auth/             # Vd: Feature Auth (chứa components, hooks, api riêng của auth)
│   ├── orders/           # Vd: Feature Orders (chứa logic đặt hàng, xem đơn hàng)
│   └── restaurants/      # Vd: Feature Restaurants (xem quán, thực đơn)
├── lib/                  # Utilities, Helper functions, Axios config, Utils.
├── hooks/                # Custom hooks dùng chung toàn cục.
├── store/                # Global State Management (vd: Zustand, Context).
└── types/                # Global TypeScript types/interfaces.
```

## 2. Quy tắc trong `src/app` (App Router)
- Thư mục `app/` **CHỈ** có nhiệm vụ định tuyến (Routing).
- Các file `page.tsx` và `layout.tsx` phải càng "mỏng" (thin) càng tốt. Chức năng chính là lấy tham số URL, gọi Server Action/Fetch để lấy dữ liệu SSR và pass props vào các component xử lý nằm ở thư mục `features/` hoặc `components/`.
- Tránh viết logic nghiệp vụ phức tạp, validate dữ liệu hay các thao tác trực tiếp với DOM trong thư mục này.

## 3. Quy tắc Feature Module (`src/features/*`)
Một tính năng cụ thể (ví dụ Quản lý Đơn hàng) phải được đóng gói vào một folder riêng trong `features/` thay vì vứt rải rác các component/api khắp nơi. Việc này giúp code module hóa (cohesive).

Cấu trúc mẫu của một Feature chuẩn:
```text
features/orders/
├── api/          # Các hàm fetch/gọi API REST liên quan đến order (getOrder, createOrder).
├── components/   # Các UI Component đặc thù chỉ thuộc về order (vd: OrderCard, CheckoutForm).
├── hooks/        # Custom hooks riêng chứa logic frontend (vd: useOrderDetails).
├── store/        # State management (nếu cần) riêng cho feature này.
└── types/        # Types, Interface DTOs dành riêng cho order.
```
*Lưu ý: Component nằm trong feature nào thì chỉ feature đó hoặc page tương ứng dùng. Không import component từ feature `orders` sang feature `auth`.*

## 4. Component Design & Server/Client
- Luôn ưu tiên dùng **Server Components (RSC)** theo mặc định để tăng hiệu năng SEO, bảo mật API key và giảm JS bundle size.
- Chỉ đặt dòng `"use client"` ở những file thực sự tương tác với người dùng hoặc dùng browser API (onClick, form validation, useState, useEffect, useRouter).
- Tách biệt ranh giới: Đẩy các Client Component xuống các nút lá càng sâu trong DOM tree càng tốt. Hạn chế biến toàn bộ một trang lớn thành Client Component.

## 5. Fetching và Gọi API
- **Tại Server Components:** Dùng `fetch()` chuẩn của Next.js (hoặc Server Actions) để tận dụng cơ chế Data Caching & Revalidation mặc định của Next.
- **Tại Client Components:** Khuyến khích sử dụng thư viện như `SWR` hoặc `React Query` (cấu hình trong `lib/`) để gọi API. Việc này giúp quản lý state loading, error và auto-refetch tốt hơn so với tự viết `useEffect`.

## 6. CSS & Styling
- Tuân thủ quy chuẩn UI/UX của dự án (Tham chiếu skill `ui-ux-pro-max`).
- Hạn chế viết CSS inline cứng. Dùng TailwindCSS (nếu cấu hình) kết hợp với các biến số design system (design tokens) để đảm bảo giao diện đồng bộ.
