# Kiến Trúc Kết Nối Frontend & Backend (Hybrid Pattern)

Dự án FoodDelivery sử dụng mô hình kết nối **Hybrid Pattern** giữa **Next.js (Frontend)** và **NestJS (Backend)** để tận dụng tối đa sức mạnh của App Router, đồng thời đáp ứng các yêu cầu khắt khe về Real-time của một ứng dụng đặt đồ ăn.

## 1. Tổng quan các phương thức kết nối

Thay vì chỉ dùng một cách gọi API duy nhất, dự án kết hợp 3 pattern tùy theo ngữ cảnh của từng trang:

### A. React Server Components (RSC) Fetching
- **Luồng:** `Browser` -> `Next.js Server` -> `NestJS Backend` (gọi nội bộ qua mạng Docker, không qua Internet).
- **Mục đích:** Dành cho các trang Public cần SEO tốt và tốc độ tải cực nhanh (vd: Danh sách nhà hàng, Chi tiết thực đơn).
- **Lợi ích:** 
  - Không lộ API key hay cấu trúc Backend.
  - Client tải trang chỉ nhận HTML thuần, giảm tải JavaScript.
  - Có thể tận dụng Next.js Cache cho các dữ liệu ít thay đổi.

### B. Client-Side Fetching (CSR)
- **Luồng:** `Browser` -> `NestJS Backend` (Public REST APIs).
- **Mục đích:** Dành cho các tương tác thay đổi dữ liệu (Mutation) như: Thêm vào giỏ hàng, Đặt món, Đăng nhập, Cập nhật thông tin cá nhân.
- **Cách triển khai:** Sử dụng thư viện **React Query** (hoặc SWR) ở các Client Components (`"use client"`).
- **Lợi ích:** Quản lý loading, error, và auto-refetch dễ dàng; xử lý Token Auth lưu ở Cookie tiện lợi hơn.

### C. WebSockets / Server-Sent Events (SSE)
- **Luồng:** `Browser` <-> `NestJS Socket Gateway`.
- **Mục đích:** Cập nhật trạng thái đơn hàng (Pending -> Cooking -> Delivering) và Tracking tài xế trên bản đồ.
- **Lợi ích:** Dữ liệu Real-time (thời gian thực), không cần trình duyệt phải gọi lại (polling) liên tục làm nghẽn server.

## 2. Hướng dẫn dành cho Frontend Developer

Khi bạn bắt tay vào code một Feature mới trong Next.js (theo chuẩn `nextjs-patterns`), hãy tự hỏi:

1. **Trang này có cần SEO không? Dữ liệu có public không?**
   -> Nếu có: Viết hàm fetch ở Server Component (trong file `page.tsx`), truyền data xuống dưới dạng props.
   
2. **Component này có form nhập liệu hay click button không?**
   -> Nếu có: Đặt `"use client"`, dùng React Query gọi REST API.
   
3. **Màn hình này có hiển thị trạng thái thay đổi liên tục không?**
   -> Nếu có: Kết nối Socket.io client, lắng nghe event từ NestJS.

## 3. Lưu ý về Bảo mật (CORS & Auth)
- Do Frontend và Backend chạy ở 2 domain/port khác nhau, NestJS Backend đã được cấu hình mở **CORS** cho các Client-side request từ Next.js.
- Token xác thực (JWT) sẽ được đính kèm ở `Authorization: Bearer` header khi Client gọi API, hoặc được forward thủ công nếu gọi từ Server Component.
