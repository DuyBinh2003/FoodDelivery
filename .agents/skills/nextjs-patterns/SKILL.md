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

## 4. Component Structure & Design
- **1 File = 1 Component**: Mỗi file `.tsx` chỉ được phép export duy nhất 1 UI Component chính.
- **Component Folder**: Mỗi component phải nằm trong một thư mục riêng biệt mang tên của component đó.
- **Tên File Component**: File `.tsx` bên trong thư mục **PHẢI** giữ nguyên tên component (Vd: `my-component/my-component.tsx`, không dùng `index.tsx`).
- **Tách file Types/Interfaces**: Các Props, Interfaces, hoặc Types dùng riêng cho component đó phải được định nghĩa ở một file `types.ts` riêng biệt cùng cấp thư mục với component (Vd: `my-component/types.ts`).
- **Child Components**: Nếu một component có các component con đặc thù chỉ dùng riêng cho nó, các component con phải được đặt trong thư mục `components/` bên trong thư mục của component cha.

## 5. Server vs Client Components
- Luôn ưu tiên dùng **Server Components (RSC)** theo mặc định để tăng hiệu năng SEO, bảo mật API key và giảm JS bundle size.
- Chỉ đặt dòng `"use client"` ở những file thực sự tương tác với người dùng hoặc dùng browser API (onClick, form validation, useState, useEffect, useRouter).
- Tách biệt ranh giới: Đẩy các Client Component xuống các nút lá càng sâu trong DOM tree càng tốt. Hạn chế biến toàn bộ một trang lớn thành Client Component.

## 5. Fetching và Gọi API
- **Tại Server Components:** Dùng `fetch()` chuẩn của Next.js (hoặc Server Actions) để tận dụng cơ chế Data Caching & Revalidation mặc định của Next.
- **Tại Client Components:** Khuyến khích sử dụng thư viện như `SWR` hoặc `React Query` (cấu hình trong `lib/`) để gọi API. Việc này giúp quản lý state loading, error và auto-refetch tốt hơn so với tự viết `useEffect`.
- **Tách biệt Logic Gọi API (Quan trọng):** Không hardcode logic gọi API (vd: dùng `apiClient`) trực tiếp bên trong các React Hooks (`useX`) hoặc UI Components. Phải luôn tách các hàm gọi API sang các file riêng biệt trong thư mục `api/` của feature đó (vd: `features/orders/api/order-api.ts`), và chỉ import hàm đã khai báo vào hook hoặc component để sử dụng. Phải định nghĩa DTOs chặt chẽ, không dùng kiểu `<any>`.

## 6. CSS, Styling & Thẩm mỹ Giao diện (Taste Skill)
- Tuân thủ quy chuẩn UI/UX và Art Direction của dự án (Tham chiếu skills `ui-ux-pro-max` và `design-taste-frontend`).
- Hạn chế viết CSS inline cứng. Dùng TailwindCSS kết hợp với các biến số design system (design tokens) để đảm bảo giao diện đồng bộ.
- Tuân thủ nguyên tắc Art Direction chống khuôn mẫu AI sáo rỗng (Anti-Slop):
  - Phân định rõ thiết kế cho **Page** (Landing page, trang thực đơn, marketing: type set lớn, bảng màu tuyển chọn, bố cục giàu tính thị giác) và **App Screen** (Admin, Driver, Merchant: panel tinh gọn, quiet borders, số liệu thật).
  - Tránh triệt để các "tells" điển hình của AI: headline 3 dòng căn giữa vô hồn, icon trong ô vuông màu nhạt lặp lại, viền xám mỏng vô nghĩa, dữ liệu số giả.

## 7. Quy chuẩn Xử lý Lỗi và Giao diện Dự phòng (Error Handling & Fallback UI)
- **App Router Error Boundaries**: Cấp root luôn có `error.tsx`, `global-error.tsx`, và `not-found.tsx`. Các trang giao diện lỗi phải cung cấp nút "Thử lại" (Retry/Reset) và "Quay về trang chủ" để người dùng không bị kẹt.
- **Không hiển thị lỗi Dev cho người dùng**: Tuyệt đối không hiển thị trực tiếp `err.message` thô (như "API Error: Bad Request (400)" hay URL mạng). Luôn sử dụng `getErrorMessage(error)` hoặc `notifyApiError(error)` từ `@/lib/error-handler` để hiển thị thông điệp tiếng Việt dễ hiểu.
- **Component ErrorState**: Khi một khối dữ liệu (Tab, Danh sách, Card) tải thất bại, không để màn hình trắng hoặc tải vô tận; bắt buộc hiển thị component `ErrorState` (`@/components/ui/error-state/error-state`) kèm nút Thử lại (`onRetry`).
- **Xử lý 401 Unauthorized**: `apiClient` tự động xóa token và chuyển hướng an toàn về `/login?expired=1&redirect=...`.
- Tham khảo chi tiết tại `docs/architecture/error-handling.md`.

