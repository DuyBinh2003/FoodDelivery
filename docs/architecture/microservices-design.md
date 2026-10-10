# Microservices Architecture Design

## 1. Kiến Trúc Tổng Thể

Dự án áp dụng mô hình **Microservices** sử dụng **NestJS Monorepo (Workspaces)**. Thay vì quản lý nhiều repository rải rác, toàn bộ backend được đặt chung trong thư mục `backend/` chia thành các ứng dụng (`apps/`) và thư viện dùng chung (`libs/`).

### Tại sao chọn NestJS Monorepo?
- **Chia sẻ code dễ dàng**: Các định nghĩa về DTOs, Event Contracts (SNS/SQS), Filters, Guards được đặt trong `libs/` và mọi service đều dùng chung được.
- **Quản lý Dependency thống nhất**: Chỉ có 1 file `package.json` và `node_modules` ở thư mục gốc `backend/`. Giảm thiểu xung đột version thư viện.
- **Tiện lợi khi Development**: Có thể chạy đồng thời nhiều service bằng công cụ của Nest CLI mà không cần mở chục terminal.

## 2. Định Nghĩa Các Service (Domain Boundaries)

Dự án phân chia các service dựa trên Domain-Driven Design (DDD):

| Service | Port Local | Nhiệm vụ chính | Database Schema |
|:---|:---|:---|:---|
| **User Service** | `3001` | Authentication (JWT), Quản lý profile Customer/Driver, Xử lý yêu cầu đăng ký (Registration). | `schema_user` |
| **Restaurant Service** | `3002` | Thông tin quán ăn, thực đơn, danh mục, tagging. Cung cấp API nội bộ để validate đơn giá món ăn. | `schema_restaurant` |
| **Order Service** | `3003` | Quản lý vòng đời đơn hàng, kiểm tra giỏ hàng, lịch sử đơn, đánh giá (reviews). | `schema_order` |
| **Search Service** | `3004` | Đồng bộ dữ liệu nhà hàng/món ăn từ Postgres sang Elasticsearch. Xử lý logic tìm kiếm full-text. | (Dùng Elasticsearch) |
| **Delivery Service** (Tương lai) | `3005` | (Trước đây là Drivers consumer) Quản lý tọa độ, theo dõi vị trí tài xế, thuật toán dispatch (matching) đơn hàng cho tài xế. | `schema_delivery` |
| **Admin Service** (BFF) | `3006` | Tổng hợp dữ liệu từ các service khác (Aggregation) để hiển thị lên Dashboard. Duyệt/từ chối đăng ký. Giao tiếp WebSocket với Admin Frontend. | `schema_admin` (chỉ lưu config) |

*(Lưu ý: API Gateway hiện tại sử dụng NGINX proxy pass request từ `/api/v1/[service]/*`)*

## 3. Quy Tắc Giao Tiếp (Inter-Service Communication)

Để các service giữ tính độc lập, chúng ta áp dụng 2 hình thức giao tiếp:

### A. Giao tiếp Đồng bộ (Synchronous - Internal HTTP)
- Dùng cho các tác vụ **cần kết quả ngay** (ví dụ: Validate đơn hàng, Lấy thông tin tổng hợp).
- **Quy tắc**: Các service gọi nhau thông qua `HttpService` của NestJS. Endpoint nội bộ thường có prefix `/internal/...` và **không cần Auth JWT** (vì chạy trong mạng nội bộ Docker).
- *Ví dụ:* Order Service gọi Internal API của Restaurant Service để tính toán lại tổng tiền giỏ hàng xem giá món ăn có thay đổi không.

### B. Giao tiếp Bất đồng bộ (Asynchronous - Event-Driven)
- Dùng cho các tác vụ **không cần kết quả ngay**, giúp decoupling hệ thống. Sử dụng **Amazon SNS & SQS** (LocalStack).
- **Quy tắc**: Publisher phát ra event (Publish), Consumer lắng nghe (Consume) và xử lý theo logic riêng. Nếu Consumer chết, message vẫn nằm trong Queue chờ xử lý.
- *Ví dụ:* User Service phát event `RegistrationCreated` -> Admin Service lắng nghe để cập nhật Dashboard realtime.

## 4. Tương Lai Mở Rộng
- **Notification Service**: Chuyên gửi Push Noti, SMS, Email dựa vào việc lắng nghe SQS Queue.
- **Payment Service**: Tích hợp cổng thanh toán (Stripe/VNPay).
- **Deployment**: Triển khai lên AWS ECS Fargate, dùng ALB thay cho NGINX. AWS SNS/SQS thật thay cho LocalStack.
