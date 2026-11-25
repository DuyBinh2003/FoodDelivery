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

## 3. Lưu ý về Bảo mật (Unified NGINX Gateway, Port Band & CORS)
- **Kiến trúc Unified Reverse Proxy (Same-Origin tại `:8080`):**
  - **NGINX Unified Gateway** (`gateway/nginx.conf` cho Docker Full-Stack, hoặc `gateway/nginx.local.conf` qua `docker-compose.local-gateway.yml` cho Hybrid Dev) lắng nghe tại cổng duy nhất **`8080`** (`http://localhost:8080`).
  - **Next.js Frontend (`:3000`)** đứng phía sau NGINX `:8080` (cả Docker `fd_frontend` lẫn `npm run dev`). Trình duyệt mở `http://localhost:8080` và gọi REST bằng đường dẫn tương đối `/api/*` (`NEXT_PUBLIC_API_GATEWAY_URL=/api`), kết nối WebSocket qua `/ws/<service>/socket.io` (`NEXT_PUBLIC_*_WS_URL=/<service>`) nên **100% Same-Origin, không phát sinh lỗi Cross-Origin / Strict-Origin**.
  - **Quy hoạch Port Band mở rộng được:** Frontend `:3000` | Core NestJS Services `:4001–4099` (`user: 4001`, `admin: 4002`, `restaurant: 4003`, `order: 4004`, `delivery: 4005`, `search: 4006`, `payment: 4007`) | AI Services `:5001–5099` (`ai-service: 5001`, `ai-python: 5002`).
  - Mỗi service đọc port động từ `resolveServicePort('<SERVICE>_PORT', defaultPort)` (`backend/libs/common/src/bootstrap/service-bootstrap.ts`).
- **CORS Dự phòng đa môi trường (Shared CORS Config):**
  - NGINX tách module (`gateway/conf.d/shared-http.conf`, `gateway/snippets/cors-headers.conf`, `gateway/conf.d/routes.conf`, `upstreams.docker.conf` / `upstreams.local.conf`), gỡ trùng lặp header từ upstream (`proxy_hide_header Access-Control-*`), phản hồi nhanh preflight `OPTIONS` (`204`) và áp dụng allowlist động (`localhost`, LAN, `CORS_ALLOWED_ORIGINS`).
  - NestJS Services dùng chung `configureAppCors(app)` và `getWsCorsOptions()`, FastAPI `ai-python` đọc `CORS_ALLOWED_ORIGINS` (`allow_credentials=True`).
- **Mở rộng khi thêm Microservice mới (3 bước):**
  1. Chọn port trống tiếp theo trong dải `4008–4099` (hoặc `5003–5099`) và khai báo `<SERVICE>_PORT` trong `.env` / `backend/.env` / `docker-compose.yml`.
  2. Khai báo `upstream <name>_service` trong `gateway/conf.d/upstreams.docker.conf` & `upstreams.local.conf`.
  3. Thêm 1 block `location ~ ^/api/<prefix>(/|$)` (kèm `/ws/<name>/socket.io` nếu có WebSocket) trong `gateway/conf.d/routes.conf`, sau đó chạy `nginx -t` để kiểm chứng.
- **Auth Header:** Token xác thực (JWT) được đính kèm tự động trong `Authorization: Bearer` bởi `apiClient` (`src/lib/api-client.ts`).
