# 🍔 Food Delivery System - Microservices

Dự án cá nhân xây dựng hệ thống đặt đồ ăn (Food Delivery) theo kiến trúc **Microservices**. Dự án bám sát các tiêu chuẩn thực tế trên môi trường Cloud.

**Tech Stack:**
- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Node.js + NestJS + TypeScript
- **Database & Cache:** PostgreSQL + Redis + Elasticsearch
- **Infrastructure:** Docker

---

## 🏗️ Kiến Trúc Kết Nối (Frontend - Backend)
Dự án áp dụng mô hình **Hybrid Pattern** để giao tiếp giữa Next.js và NestJS nhằm tối ưu hoá trải nghiệm:
1. **Server-to-Server (RSC):** Fetch nội bộ cho trang Public (SEO tốt, tốc độ bàn thờ).
2. **Client Fetching (CSR):** Dùng React Query cho các tương tác mutation (Form đặt hàng, Login).
3. **WebSockets:** Bắt buộc dùng để tracking tài xế và nhận trạng thái đơn hàng thời gian thực.
*(Chi tiết xem tại: [Tài liệu Kiến trúc Kết nối FE-BE](./docs/architecture/frontend-backend-connection.md))*

---

## 🗺️ Lộ Trình Phát Triển

### 1. Thiết kế Hệ thống & Database
Xác định ranh giới Microservices. Trước khi viết code, cần xác định rõ các module độc lập và mô hình dữ liệu.

*   **Phân chia Service:**
    *   **User Service:** Quản lý tài khoản và xác thực cho toàn bộ người dùng (`USER`, `ADMIN`). Hệ thống sử dụng mô hình "Profile Mở rộng" (Add-ons): Một `USER` có thể gửi yêu cầu tạo thêm `driver_profile` hoặc đăng ký mở `restaurant` thay vì bị giới hạn cứng vào một Role duy nhất.
    *   **Restaurant Service:** Quản lý thực đơn (Menu), giá cả, ca làm việc. Mối liên hệ thuộc quyền sở hữu của `USER`.
    *   **Order Service:** Quản lý logic đặt món, state machine cho trạng thái đơn (Pending, Cooking, Delivering, Completed). (Xem [Tài liệu Order Service](./docs/services/order-service.md))
*   **Database Schema:** Thiết kế các bảng trên PostgreSQL. Phân chia tách schema (VD: `schema_user`, `schema_order`) để đảm bảo tính độc lập dữ liệu giữa các service trên cùng 1 instance.

### 2. Hạ tầng Local & Môi trường Dev (Hybrid Workflow)
Hệ thống sử dụng mô hình phát triển **Hybrid** kết hợp giữa Docker và Local để đạt tốc độ lập trình (HMR) nhanh nhất.

*   **Infrastructure (Docker):** Sử dụng `docker-compose.dev.yml` để chạy các database và services nền tảng (PostgreSQL, Redis, Elasticsearch, LocalStack).
*   **Application (Local):** Frontend (Next.js) và Backend (NestJS) được chạy trực tiếp trên máy host (`npm run dev` / `npm run start:dev:local`) kết nối vào các container qua port đã expose.
*   **Full Stack Docker:** Vẫn duy trì file `docker-compose.yml` nguyên bản chứa toàn bộ hệ thống phục vụ cho việc test tích hợp, CI/CD và onboarding nhanh chóng.
*   **Cấu trúc thư mục:** Thiết lập dạng Monorepo chia tách Frontend và Backend rõ ràng.

### 3. Phát triển Core APIs
Tích hợp NestJS + PostgreSQL + Redis.

*   **Định tuyến:** Phát triển các RESTful APIs hoặc GraphQL endpoints trên NestJS.
*   **Tương tác dữ liệu:** Dùng **TypeORM** (với `synchronize: false`) để query PostgreSQL, ánh xạ chính xác với các file migrate của `node-pg-migrate`. Cấu trúc source code (Modules, Entities, DTOs) tuân thủ chặt chẽ theo chuẩn `nestjs-patterns`.
*   **Caching:** Sử dụng Redis để cache dữ liệu tần suất truy cập cao (ví dụ: danh sách món ăn, thông tin nhà hàng) và quản lý session/rate limiting.

### 4. Xử lý Bất đồng bộ & Event-Driven
Giao tiếp giữa các Services thông qua luồng dữ liệu mang tính sự kiện.

*   Khi khách chốt đơn, Order Service sẽ **không** gọi HTTP trực tiếp đến dịch vụ tìm tài xế. Thay vào đó, đẩy một sự kiện vào Message Broker.
*   **Công nghệ:** Sử dụng Amazon SQS / SNS hoặc Amazon EventBridge. (Trên local, dùng LocalStack).
*   **Luồng xử lý:** Một hàm Lambda (hoặc Worker như Driver Service) sẽ lắng nghe hàng đợi này, lọc danh sách tài xế gần nhất và gửi thông báo, đảm bảo hệ thống không bị nghẽn nếu không tìm thấy tài xế ngay lập tức. (Xem [Tài liệu Driver Service](./docs/services/driver-service.md))

### 5. Tự động hóa CI/CD Pipeline
Kiểm thử và triển khai tự động.

*   **Công cụ:** Sử dụng GitHub Actions.
*   **CI:** Tự động cài đặt dependencies, chạy linter và unit test cho code Node.js mỗi lần có commit mới.
*   **CD:** Viết script tự động đóng gói và deploy toàn bộ API Gateway cùng Lambda functions lên môi trường Cloud.

---

## 🚀 Các Tính Năng Nâng Cao (Ghi Điểm Dự Án)
Để dự án thể hiện rõ tư duy của một kỹ sư hệ thống, cần bổ sung các yếu tố sau khi luồng cơ bản đã hoàn thành:

*   **Bảo mật:** Dùng API Gateway Lambda Authorizer (xác thực bằng JWT) để phân quyền chặt chẽ giữa 2 role cơ bản: Người dùng (`USER`) và Quản trị viên (`ADMIN`), kết hợp kiểm tra quyền sở hữu đối với Profile (Driver/Restaurant).
*   **Giới hạn tài nguyên (Rate Limiting):** Cấu hình Usage Plans trên API Gateway để chặn spam request, bảo vệ hệ thống khỏi DDoS.
*   **Observability (Giám sát):** Tích hợp CloudWatch và AWS X-Ray để theo dõi log tập trung. Cho phép nhìn được một request đi từ `API Gateway -> Lambda -> PostgreSQL` mất chính xác bao nhiêu mili-giây.
*   **Tìm kiếm & Lọc thông minh (Smart Search):** Tích hợp engine tìm kiếm Elasticsearch để tìm kiếm full-text nhà hàng/món ăn, filter linh hoạt theo đánh giá, khoảng cách, freeship, và phân loại (category).
*   **Lịch sử, Đặt lại & Đánh giá (Order History & Review):** Người dùng xem lại lịch sử các đơn hàng đã đặt, thực hiện đặt lại nhanh (Reorder) với cơ chế Single Restaurant, và nộp đánh giá chi tiết (Rating 1-5 sao kèm hình ảnh) cho món ăn, nhà hàng, tài xế.
