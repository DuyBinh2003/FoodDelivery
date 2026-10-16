# Order Service (Hạ Tầng & Đặc Tả Kỹ Thuật Đơn Hàng)

Tài liệu đặc tả hạ tầng, mô hình kiến trúc, cơ sở dữ liệu, danh sách API và cơ chế tích hợp sự kiện của **Order Service** trong hệ sinh thái **Food Delivery**.

---

## 1. Tổng Quan & Trách Nhiệm (Boundaries)

Order Service là microservice trung tâm chịu trách nhiệm xử lý toàn bộ vòng đời của đơn hàng từ thời điểm người dùng kiểm tra giỏ hàng (Cart Validation), đặt đơn (Order Creation), chuyển đổi trạng thái (State Machine), điều phối cuốc xe tài xế (Driver Trip Handling), cho đến đánh giá chất lượng (Order Review).

- **Phạm vi nghiệp vụ**:
  - Tiếp nhận và thẩm định đơn hàng của Khách hàng (Customer).
  - Quản lý máy trạng thái đơn hàng: `PENDING` ➔ `ACCEPTED` ➔ `COOKING` ➔ `DELIVERING` ➔ `COMPLETED` (hoặc `CANCELLED`).
  - Cung cấp API phục vụ tài xế tra cứu cuốc xe, tổng kết thu nhập và cập nhật trạng thái giao hàng.
  - Thu nhận đánh giá đa chiều (Nhà hàng, Món ăn, Tài xế).
  - Cung cấp số liệu thống kê nội bộ (Metrics) cho Admin Service.
- **Thông số kết nối hạ tầng**:
  - **Docker Container Name**: `fd_order_service`
  - **Host Port**: `3004`
  - **Container Port**: `3004`
  - **Docker Network**: `fooddelivery_default`
  - **API Gateway Routing**: `http://localhost:3000/orders/*` ➔ `http://order_service:3004/orders/*`
  - **Internal Network**: Chặn toàn bộ truy cập từ internet vào các route `/internal/*` qua NGINX Gateway.

---

## 2. Kiến Trúc Hạ Tầng & Công Nghệ (Infrastructure Stack)

```mermaid
graph TD
    Client["📱 Client (Customer / Driver / Admin)"] -->|HTTP /orders/*| GW["🚪 NGINX API Gateway (:3000)"]
    AdminSvc["👑 Admin Service (:3002)"] -->|HTTP Internal /internal/*| OS
    
    subgraph "Order Service Container (:3004)"
        GW -->|Reverse Proxy| OS["🛒 Order Service (NestJS Monorepo)"]
        OS --> Controller["OrdersController & OrdersInternalController"]
        Controller --> UseCases["Use Cases (Clean Architecture)"]
        UseCases --> Repos["OrderReadRepository & OrderWriteRepository"]
        UseCases --> SQS["SqsService (AWS SDK v3)"]
    end

    subgraph "Data Storage"
        Repos -->|TypeORM Connection| DB[("🐘 PostgreSQL (:5432)\nSchema: schema_order")]
    end

    subgraph "Event-Driven Messaging"
        SQS -->|Publish Event| Queue[("📥 SQS Queue (:4566)\nfood-delivery-orders")]
        Queue --> Consumer["🛵 Driver / Notification Consumers"]
    end
```

- **Runtime Framework**: NestJS 12 trên nền Node.js ES Modules (`"type": "module"`), TypeScript strict mode.
- **ORM & Data Access**: TypeORM 1.1 + `node-pg-migrate` quản lý schema migration độc lập.
- **Cơ sở dữ liệu**: PostgreSQL 15, phân vùng biệt lập tại schema `schema_order`.
- **Hàng đợi tin nhắn**: AWS SQS (giả lập bằng LocalStack tại cổng `4566`).
- **Xác thực & Phân quyền**: `Passport-JWT` + `JwtAuthGuard` trích xuất thông tin người dùng từ Bearer token qua `@CurrentUser()`.
- **Validation & Serialization**: `ValidationPipe` toàn cục (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) và `ClassSerializerInterceptor`.

---

## 3. Tính Năng Cốt Lõi

1. **Kiểm tra giỏ hàng (`ValidateCartUseCase`)**: Tính toán tổng tiền dự kiến, kiểm tra món ăn trước khi thanh toán.
2. **Khởi tạo đơn hàng giao dịch (`CreateOrderUseCase` + `OrderWriteRepository`)**:
   - Ghi nhận `t_order` và danh sách `t_order_item` trong cùng một Database Transaction.
   - Tự động phát sự kiện `ORDER_CREATED` vào hàng đợi AWS SQS.
3. **Quản lý máy trạng thái (`UpdateOrderStatusUseCase`)**:
   - Kiểm soát tính hợp lệ của việc chuyển đổi trạng thái (Tránh nhảy cóc trạng thái).
   - Phát sự kiện `ORDER_STATUS_CHANGED` và `ORDER_ACCEPTED` cho các microservice liên quan.
4. **Quản lý cuốc xe cho tài xế (`DriverTrips`, `DriverSummary`, `DriverReviews`)**:
   - Cho phép tài xế xem danh sách đơn đang giao, tổng kết thu nhập và đánh giá từ khách.
5. **Đánh giá đơn hàng (`CreateOrderReviewUseCase`)**:
   - Khách hàng đánh giá 1-5 sao và đính kèm ảnh cho đơn đã hoàn thành (`COMPLETED`).
6. **Bảng điều khiển quản trị (`GetOrdersAdminUseCase`)**:
   - Phân trang, lọc theo trạng thái, theo nhà hàng và khoảng thời gian tạo đơn.

---

## 4. Danh Sách API (RESTful Endpoints)

### A. Public / Client-Facing APIs (Truy cập qua API Gateway `/orders/*`)

| Endpoint | Method | Auth Guard | Mô tả | Request Body / Query | Mã phản hồi |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `/orders/validate-cart` | `POST` | Public | Kiểm tra và tính tổng tiền giỏ hàng | `ValidateCartDto` | `200`, `400` |
| `/orders` | `POST` | `JwtAuthGuard` | Tạo đơn hàng mới cho khách hàng đăng nhập | `CreateOrderDto` | `201`, `400`, `401` |
| `/orders/history/me` | `GET` | `JwtAuthGuard` | Xem lịch sử đơn hàng của người dùng hiện tại | Không | `200`, `401` |
| `/orders/:id` | `GET` | `JwtAuthGuard` | Tra cứu chi tiết một đơn hàng theo UUID | Param `id: UUID` | `200`, `401`, `404` |
| `/orders/:id/status` | `PATCH` | `JwtAuthGuard` | Cập nhật trạng thái đơn hàng (Khách / Quán / Admin) | `UpdateOrderStatusDto` | `200`, `400`, `401` |
| `/orders/:id/reviews` | `POST` | `JwtAuthGuard` | Gửi đánh giá cho đơn hàng đã hoàn tất | `CreateOrderReviewDto` | `201`, `400`, `404` |
| `/orders/driver/trips` | `GET` | `JwtAuthGuard` | Lấy danh sách cuốc xe nhận giao của tài xế | Không | `200`, `401` |
| `/orders/driver/summary` | `GET` | `JwtAuthGuard` | Thống kê tổng số cuốc, doanh thu và điểm đánh giá | Không | `200`, `401` |
| `/orders/driver/reviews` | `GET` | `JwtAuthGuard` | Xem danh sách đánh giá tài xế nhận được | Không | `200`, `401` |
| `/orders/driver/trips/:id/status` | `PATCH` | `JwtAuthGuard` | Tài xế cập nhật trạng thái cuốc (`DELIVERING`, `COMPLETED`) | `{ "status": "COMPLETED" }` | `200`, `400`, `401` |
| `/orders` | `GET` | `JwtAuthGuard` | Quản trị viên tra cứu danh sách đơn với bộ lọc & phân trang | `QueryOrdersDto` (`page`, `limit`, `status`,...) | `200`, `401` |

### B. Internal APIs (Giao tiếp nội bộ Docker, NGINX Gateway chặn 403)

| Endpoint | Method | Service Gọi | Mục đích | Payload | Phản hồi |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/internal/orders/metrics` | `GET` | `admin-service` | Lấy tổng số lượng đơn và tổng GMV doanh thu tích lũy | Không | `{ "totalOrders": number, "totalGmv": number }` |
| `/internal/orders/:id/status` | `PATCH` | Các service nội bộ | Đồng bộ cưỡng bức trạng thái đơn qua microservice khác | `{ "status": OrderStatus }` | Order Entity đã cập nhật |

---

## 5. Cơ Chế Sự Kiện (Event-Driven Messaging via SQS)

Order Service đóng vai trò là một **Event Publisher** đẩy các sự kiện nghiệp vụ vào hàng đợi SQS để đảm bảo tính phản hồi nhanh và giải phóng kết nối đồng bộ:

- **Hàng đợi mục tiêu**: `food-delivery-orders`
- **Địa chỉ Queue ARN / URL**: `http://localhost:4566/000000000000/food-delivery-orders`
- **Cấu hình AWS SDK**: Client `@aws-sdk/client-sqs` cấu hình trỏ vào LocalStack endpoint `http://localhost:4566`.

### Danh Mục Sự Kiện Phát Ra

| Tên Sự Kiện | Event Type Enum | Điều kiện phát | Payload tóm tắt |
| :--- | :--- | :--- | :--- |
| **Đơn hàng được tạo** | `ORDER_CREATED` | Sau khi transaction tạo đơn và món thành công trong DB | `{ orderId, restaurantId, userId, totalAmount, shippingAddress }` |
| **Đổi trạng thái đơn** | `ORDER_STATUS_CHANGED` | Khi đơn chuyển trạng thái bất kỳ (`status` thay đổi) | `{ orderId, previousStatus, newStatus, changedAt, changedBy }` |
| **Nhà hàng nhận đơn** | `ORDER_ACCEPTED` | Khi đơn được chuyển sang trạng thái `ACCEPTED` | `{ orderId, restaurantId, customerId, estimatedDeliveryTime }` |
| **Đơn cập nhật** | `ORDER_STATUS_UPDATED` | Dự phòng tương thích hợp đồng cũ | `{ orderId, status }` |

---

## 6. Database Schema (`schema_order`)

Cơ sở dữ liệu của Order Service hoàn toàn độc lập, lưu trữ tại schema PostgreSQL `schema_order`. Mọi liên kết ra thực thể ngoài (User, Restaurant, Driver, Menu Item) đều là **Logical References** bằng UUID.

```mermaid
erDiagram
    t_order ||--o{ t_order_item : "has many"
    t_order ||--o| t_order_review : "has one"

    t_order {
        uuid id PK
        uuid customer_id "Logical FK -> schema_user.m_user"
        uuid restaurant_id "Logical FK -> schema_restaurant.m_restaurant"
        uuid driver_id "Logical FK -> schema_driver.m_driver_profile"
        numeric total_amount "numeric(15,2)"
        varchar status "PENDING, ACCEPTED, COOKING, DELIVERING, COMPLETED, CANCELLED"
        text delivery_address
        text note
        timestamptz estimated_delivery_time
        varchar payment_method "Mặc định CASH"
        timestamptz created_at
        timestamptz updated_at
        boolean is_deleted
    }

    t_order_item {
        uuid id PK
        uuid order_id FK "FK -> t_order.id (ON DELETE RESTRICT)"
        uuid menu_item_id "Logical FK -> schema_restaurant.m_menu_item"
        integer quantity
        numeric unit_price "numeric(15,2)"
        timestamptz created_at
        timestamptz updated_at
        boolean is_deleted
    }

    t_order_review {
        uuid id PK
        uuid order_id FK "FK -> t_order.id (UNIQUE)"
        integer restaurant_rating "1-5"
        integer driver_rating "1-5"
        integer food_rating "1-5"
        text comment
        text_array image_urls
        timestamptz created_at
        timestamptz updated_at
        boolean is_deleted
    }
```

### Bảng Chi Tiết:

1. **`t_order`**:
   - `id`: Khóa chính UUIDv4 mặc định sinh bởi `uuid_generate_v4()`.
   - `customer_id`, `restaurant_id`: Bắt buộc (`NOT NULL`).
   - `driver_id`: Nullable (được gán khi tài xế nhận cuốc hoặc hệ thống điều phối).
   - `status`: Mặc định `'PENDING'`.
   - `note`: Ghi chú thêm từ khách hàng (Nullable).
   - `payment_method`: Phương thức thanh toán (`CASH`, `WALLET`, `VNPAY`...).
2. **`t_order_item`**:
   - `order_id`: Khóa ngoại tham chiếu `t_order(id)` với hành vi `ON DELETE RESTRICT` để bảo vệ toàn vẹn lịch sử giao dịch.
   - `quantity` và `unit_price`: Bắt buộc, giá lưu tại thời điểm đặt đơn.
3. **`t_order_review`**:
   - Ràng buộc `UNIQUE(order_id)` đảm bảo mỗi đơn hàng chỉ được tạo một review duy nhất.
   - `image_urls`: Kiểu dữ liệu `text[]` (PostgreSQL native array) lưu danh sách URL bằng chứng/hình ảnh.

---

## 7. Cấu Hình Hạ Tầng Môi Trường (Environment Configuration)

Order Service tích hợp lớp kiểm định biến môi trường nghiêm ngặt tại thời điểm khởi động (`validation.ts`). Nếu thiếu bất kỳ biến nào, service sẽ dừng khẩn cấp (Hard boot failure):

| Tên Biến | Bắt buộc | Ví dụ giá trị | Giải thích vai trò |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Có | `development` / `production` | Môi trường vận hành |
| `DATABASE_URL` | Có | `postgresql://postgres:password@localhost:5432/food_delivery` | Chuỗi kết nối Database |
| `JWT_SECRET` | Có | `super-secret-key-for-local-dev` | Khóa bí mật giải mã Bearer Token |
| `AWS_REGION` | Có | `ap-southeast-1` | Vùng tài nguyên AWS |
| `AWS_ACCESS_KEY_ID` | Có | `test` | Access key xác thực AWS / LocalStack |
| `AWS_SECRET_ACCESS_KEY` | Có | `test` | Secret key xác thực AWS / LocalStack |
| `SQS_ENDPOINT` | Có | `http://localhost:4566` | Endpoint kết nối SQS LocalStack |
| `SQS_QUEUE_URL` | Có | `http://localhost:4566/000000000000/food-delivery-orders` | URL đẩy tin nhắn sự kiện đơn hàng |
| `RESTAURANT_SERVICE_URL` | Không | `http://restaurant-service:3003` | URL gọi xác thực món ăn nội bộ |

---

## 8. Kiểm Thử, Vận Hành & Khởi Chạy

### A. Khởi tạo cơ sở dữ liệu (Migration & Seed)
Từ thư mục `backend/`:
```bash
# Chạy migration tạo schema_order và các bảng t_order, t_order_item, t_order_review
npm run migrate:order

# Nạp dữ liệu mẫu cho Order Service
node migrations/order-service/1789353917003_seed-orders.js
```

### B. Khởi chạy trong môi trường phát triển (Development)
```bash
# Khởi chạy riêng Order Service (kèm tsc-alias và watch mode)
npm run start:order

# Hoặc khởi chạy toàn bộ hệ sinh thái microservices
npm run start:all
```

### C. Kiểm tra kiểu dữ liệu (Static Typecheck)
```bash
npx tsc --noEmit -p apps/order-service/tsconfig.json
```

### D. Khởi chạy với Docker Compose
```bash
# Khởi chạy container Order Service cùng toàn bộ hạ tầng phụ thuộc
docker compose up -d order-service

# Xem log thực thi container
docker compose logs -f order-service
```
