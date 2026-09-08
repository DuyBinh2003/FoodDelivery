# 🍔 Food Delivery System - Serverless Microservices

Dự án cá nhân xây dựng hệ thống đặt đồ ăn (Food Delivery) theo kiến trúc **Serverless Microservices**. Dự án bám sát các tiêu chuẩn thực tế trên môi trường Cloud.

**Tech Stack:** Node.js, PostgreSQL, API Gateway, AWS Lambda, Docker.

---

## 🗺️ Lộ Trình Phát Triển

### 1. Thiết kế Hệ thống & Database
Xác định ranh giới Microservices. Trước khi viết code, cần xác định rõ các module độc lập và mô hình dữ liệu.

*   **Phân chia Service:**
    *   **User Service:** Quản lý tài khoản, xác thực cho Customer, Driver và Admin.
    *   **Restaurant Service:** Quản lý thực đơn (Menu), giá cả, ca làm việc.
    *   **Order Service:** Quản lý logic đặt món, state machine cho trạng thái đơn (Pending, Cooking, Delivering, Completed).
*   **Database Schema:** Thiết kế các bảng trên PostgreSQL. Phân chia tách schema (VD: `schema_user`, `schema_order`) để đảm bảo tính độc lập dữ liệu giữa các service trên cùng 1 instance.

### 2. Hạ tầng Local & Môi trường Dev
Dockerize và cấu hình Serverless.

*   **Docker:** Sử dụng file `docker-compose.yml` để khởi chạy PostgreSQL cục bộ.
*   **Giả lập Cloud:** Sử dụng Serverless Framework hoặc AWS SAM để giả lập API Gateway và chạy thử các hàm Lambda Node.js trên máy cá nhân.
*   **Cấu trúc thư mục:** Thiết lập dạng **Monorepo** (dùng thư mục con đơn giản hoặc công cụ như Nx). Điều này giúp chia tách nhiều Lambda functions nhưng vẫn dùng chung các thư viện cốt lõi (Shared libraries) như logic kết nối DB hay middleware xử lý lỗi.

### 3. Phát triển Core APIs
Tích hợp Lambda + Node.js + PostgreSQL.

*   **Định tuyến:** Cấu hình các route trên API Gateway (ví dụ: `POST /orders`, `GET /restaurants`). Mỗi route sẽ kích hoạt một Lambda function tương ứng.
*   **Tương tác dữ liệu:** Dùng thư viện `pg` hoặc ORM (Prisma/TypeORM) trong Node.js để query PostgreSQL.
*   **Tối ưu kiến trúc:** Thiết lập cơ chế quản lý connection hợp lý (ví dụ dùng Amazon RDS Proxy trong thực tế) để tránh làm sập connection pool của PostgreSQL khi Lambda scale up hàng ngàn instance.

### 4. Xử lý Bất đồng bộ & Event-Driven
Giao tiếp giữa các Services thông qua luồng dữ liệu mang tính sự kiện.

*   Khi khách chốt đơn, Order Service sẽ **không** gọi HTTP trực tiếp đến dịch vụ tìm tài xế. Thay vào đó, đẩy một sự kiện vào Message Broker.
*   **Công nghệ:** Sử dụng Amazon SQS / SNS hoặc Amazon EventBridge.
*   **Luồng xử lý:** Một hàm Lambda (Driver Service) sẽ lắng nghe hàng đợi này, lọc danh sách tài xế gần nhất và gửi thông báo, đảm bảo hệ thống không bị nghẽn nếu không tìm thấy tài xế ngay lập tức.

### 5. Tự động hóa CI/CD Pipeline
Kiểm thử và triển khai tự động.

*   **Công cụ:** Sử dụng GitHub Actions hoặc GitLab CI.
*   **CI:** Tự động cài đặt dependencies, chạy linter và unit test cho code Node.js mỗi lần có commit mới.
*   **CD:** Viết script tự động đóng gói và deploy toàn bộ API Gateway cùng Lambda functions lên môi trường Cloud.

---

## 🚀 Các Tính Năng Nâng Cao (Ghi Điểm Dự Án)
Để dự án thể hiện rõ tư duy của một kỹ sư hệ thống, cần bổ sung các yếu tố sau khi luồng cơ bản đã hoàn thành:

*   **Bảo mật:** Dùng API Gateway Lambda Authorizer (xác thực bằng JWT) để phân quyền chặt chẽ giữa 3 role: Người đặt, Tài xế và Admin.
*   **Giới hạn tài nguyên (Rate Limiting):** Cấu hình Usage Plans trên API Gateway để chặn spam request, bảo vệ hệ thống khỏi DDoS.
*   **Observability (Giám sát):** Tích hợp CloudWatch và AWS X-Ray để theo dõi log tập trung. Cho phép nhìn được một request đi từ `API Gateway -> Lambda -> PostgreSQL` mất chính xác bao nhiêu mili-giây.
