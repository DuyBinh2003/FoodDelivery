# Order Service (Hạ Tầng & Đặc Tả Kỹ Thuật Đơn Hàng)

Tài liệu đặc tả hạ tầng, mô hình kiến trúc, cơ sở dữ liệu, danh sách API và cơ chế tích hợp sự kiện của **Order Service** trong hệ sinh thái **Food Delivery**.

---

## 1. Tổng Quan & Trách Nhiệm (Boundaries)

Order Service là microservice trung tâm chịu trách nhiệm xử lý toàn bộ vòng đời của đơn hàng từ thời điểm người dùng kiểm tra giỏ hàng (Cart Validation), đặt đơn (Order Creation), chuyển đổi trạng thá- **Phạm vi nghiệp vụ**:
  - Tiếp nhận và thẩm định đơn hàng của Khách hàng (Customer).
  - Đệm chịu tải tiếp nhận đơn (Queue-Based Load Leveling) qua SQS FIFO để bảo vệ cơ sở dữ liệu.
  - Quản lý trạng thái đơn hàng tạm thời (In-flight State) trên Redis Cache trong suốt quá trình luân chuyển.
  - Quản lý máy trạng thái đơn hàng: `PENDING` ➔ `ACCEPTED` ➔ `COOKING` ➔ `DELIVERING` ➔ `COMPLETED` (hoặc `CANCELLED`).
  - Phối hợp với nhà hàng (chế biến món linh hoạt không ép FIFO) và điều phối cuốc xe cho tài xế qua SNS Fanout.
  - Trì hoãn ghi cơ sở dữ liệu (Deferred Persistence): Chỉ ghi nhận vĩnh viễn vào PostgreSQL `schema_order` khi đơn hàng hoàn tất (`COMPLETED`) hoặc hủy có phát sinh đối soát.
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
        UseCases --> RedisRepo["OrderRedisRepository (In-flight State)"]
        UseCases --> Repos["OrderReadRepository & OrderWriteRepository"]
        UseCases --> SQS["SqsService (AWS SDK v3)"]
    end

    subgraph "Tầng Đệm & Lưu Trữ Tạm Thời (In-flight)"
        RedisRepo --> Redis[("⚡ Redis Cache (:6379)\norder:inflight:{id}")]
        SQS -->|1. Đệm Đơn Hàng| SQS_FIFO[("📥 SQS FIFO Queue\norders-processing.fifo")]
        SQS -->|2. Fanout Tài Xế| SNS_Topic[("📢 SNS Topic\norder-driver-dispatch")]
    end

    subgraph "Tầng Lưu Trữ Vĩnh Viễn (Chỉ ghi khi COMPLETED)"
        Repos -->|TypeORM Connection| DB[("🐘 PostgreSQL (:5432)\nSchema: schema_order")]
    end
```

- **Runtime Framework**: NestJS 12 trên nền Node.js ES Modules (`"type": "module"`), TypeScript strict mode.
- **ORM & Data Access**: TypeORM 1.1 + `node-pg-migrate` quản lý schema migration độc lập.
- **Cơ sở dữ liệu**: PostgreSQL 15, phân vùng biệt lập tại schema `schema_order` (Deferred write khi `COMPLETED`).
- **Bộ nhớ đệm In-flight**: Redis 7, quản lý toàn bộ dữ liệu đơn hàng đang xử lý với TTL 24h.
- **Hàng đợi tin nhắn**: AWS SQS (FIFO Queue `orders-processing.fifo` và Standard Queue `food-delivery-orders`).
- **Phân phối tin nhắn**: AWS SNS (`order-driver-dispatch` Fanout tới các queue của tài xế).
- **Xác thực & Phân quyền**: `Passport-JWT` + `JwtAuthGuard` trích xuất thông tin người dùng từ Bearer token qua `@CurrentUser()`.
- **Validation & Serialization**: `ValidationPipe` toàn cục (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) và `ClassSerializerInterceptor`.

---

## 3. Tính Năng Cốt Lõi

1. **Kiểm tra giỏ hàng (`ValidateCartUseCase`)**: Tính toán tổng tiền dự kiến, kiểm tra món ăn trước khi thanh toán.
2. **Khởi tạo đơn hàng bất đồng bộ (`CreateOrderUseCase` + Queue Load Leveling)**:
   - Sinh trước `orderId` (UUID), lưu snapshot khởi tạo vào Redis `order:inflight:{id}` (`status: PENDING`).
   - Đẩy message vào SQS FIFO `orders-processing.fifo` (nhóm theo `restaurant_id`), phản hồi tức thì HTTP 201 cho Client.
   - **Tuyệt đối không ghi PostgreSQL ở phase này** để chống nghẽn DB trong giờ cao điểm.
3. **Bếp chế biến linh hoạt & Điều phối tài xế (`UpdateOrderStatusUseCase`)**:
   - Nhà hàng theo dõi danh sách đơn chờ, chủ động chế biến theo thực tế món ăn (không ép FIFO cứng nhắc ở bếp).
   - Khi nhà hàng nhận đơn (`ACCEPTED`), hệ thống cập nhật Redis và phát sự kiện vào SNS Topic `order-driver-dispatch` để Fanout cho tài xế.
4. **Ghi nhận cơ sở dữ liệu khi hoàn tất (Deferred Persistence)**:
   - Khi tài xế giao món thành công và nhấn `COMPLETED`: hệ thống dump toàn bộ snapshot từ Redis xuống PostgreSQL `t_order` và `t_order_item` trong cùng một Database Transaction.
   - Nếu đơn bị `CANCELLED` mà đã thanh toán: ghi DB để đối soát hoàn tiền.
5. **Tra cứu lai (Hybrid Lookup Strategy)**:
   - `GetOrderByIdUseCase` và `GetOrderHistoryUseCase` kiểm tra đơn đang luân chuyển trên Redis trước, kết hợp với lịch sử đơn trong PostgreSQL.
6. **Đánh giá đơn hàng (`CreateOrderReviewUseCase`)**:
   - Khách hàng đánh giá 1-5 sao và đính kèm ảnh cho đơn đã hoàn thành (`COMPLETED`).
7. **Bảng điều khiển quản trị (`GetOrdersAdminUseCase`)**:
   - Phân trang, lọc theo trạng thái, theo nhà hàng và khoảng thời gian tạo đơn.

---

## 4. Danh Sách API (RESTful Endpoints)

### A. Public / Client-Facing APIs (Truy cập qua API Gateway `/orders/*`)

| Endpoint | Method | Auth Guard | Mô tả | Request Body / Query | Mã phản hồi |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| `/orders/validate-cart` | `POST` | Public | Kiểm tra và tính tổng tiền giỏ hàng | `ValidateCartDto` | `200`, `400` |
| `/orders` | `POST` | `JwtAuthGuard` | Tạo đơn bất đồng bộ vào SQS `food-delivery-orders` & Redis (Non-blocking, chưa ghi DB) | `CreateOrderDto` | `201`, `400`, `401` |
| `/orders/history/me` | `GET` | `JwtAuthGuard` | Xem lịch sử đơn hàng (Hợp nhất đơn đang chạy từ Redis & quá khứ từ DB) | Không | `200`, `401` |
| `/orders/restaurant/:restaurantId` | `GET` | `JwtAuthGuard` | Lấy danh sách đơn của quán (In-flight từ Redis + lịch sử từ DB) | Param `restaurantId: UUID` | `200`, `401` |
| `/orders/:id` | `GET` | `JwtAuthGuard` | Tra cứu chi tiết đơn hàng (Tra cứu lai: Redis ➔ PostgreSQL) | Param `id: UUID` | `200`, `401`, `404` |
| `/orders/:id/events` | `GET (SSE)` | `JwtAuthGuard` | Luồng sự kiện Server-Sent Events (SSE) theo dõi trạng thái đơn hàng thời gian thực qua Redis Pub/Sub (`order:events:{id}`) | Param `id: UUID`, Query `?token=...` hoặc Cookie | `200 (text/event-stream)`, `401`, `403`, `404` |
| `/orders/:id/status` | `PATCH` | `JwtAuthGuard` | Cập nhật trạng thái chế biến (`COOKING`, `READY_FOR_PICKUP`) | `UpdateOrderStatusDto` | `200`, `400`, `401` |
| `/orders/driver/available` | `GET` | `JwtAuthGuard` | Lấy danh sách chuyến xe broadcast đang tìm tài xế (Chỉ phát tán cho tài xế `status === 'ONLINE'` & `verification_status === 'APPROVED'`, trả về `[]` nếu ngoại tuyến) | Không | `200`, `401` |
| `/orders/:id/driver-claim` | `POST` | `JwtAuthGuard` | Tài xế nhận cuốc xe với Redis Atomic Lock (chống race condition; từ chối 403 nếu tài xế đang offline/chưa active) | Param `id: UUID` | `200`, `401`, `403`, `409` |
| `/orders/driver/trips` | `GET` | `JwtAuthGuard` | Lấy danh sách cuốc xe của tài xế (Bao gồm mốc `claimed_at`, `completed_at`, và thời lượng cuốc `duration_minutes`) | Không | `200`, `401` |
| `/orders/driver/summary` | `GET` | `JwtAuthGuard` | Thống kê tổng số cuốc, doanh thu và điểm đánh giá | Không | `200`, `401` |
| `/orders/driver/reviews` | `GET` | `JwtAuthGuard` | Xem danh sách đánh giá tài xế nhận được | Không | `200`, `401` |
| `/orders/:id/review` | `POST` | `JwtAuthGuard` | Gửi đánh giá cho đơn hàng đã hoàn tất (Đồng bộ tức thời sang `restaurant-service` & `search-service`) | `CreateOrderReviewDto` | `201`, `400`, `404` |
| `/orders/restaurants/:restaurantId/reviews` | `GET` | Public | Lấy danh sách đánh giá của nhà hàng kèm phân bổ số sao (1-5 sao) | Query `page`, `limit` | `200`, `400` |
| `/orders` | `GET` | `JwtAuthGuard` | Quản trị viên tra cứu danh sách đơn với bộ lọc & phân trang | `QueryOrdersDto` (`page`, `limit`, `status`,...) | `200`, `401` |

### B. Internal APIs (Giao tiếp nội bộ Docker, NGINX Gateway chặn 403)

| Endpoint | Method | Service Gọi | Mục đích | Payload | Phản hồi |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/internal/orders/metrics` | `GET` | `admin-service` | Lấy tổng số lượng đơn và tổng GMV doanh thu tích lũy | Không | `{ "totalOrders": number, "totalGmv": number }` |
| `/internal/orders/:id/status` | `PATCH` | Các service nội bộ | Đồng bộ cưỡng bức trạng thái đơn qua microservice khác | `{ "status": OrderStatus }` | Order Entity đã cập nhật |

---

## 5. Cơ Chế Sự Kiện (Event-Driven Messaging via SQS & SNS)

Order Service đóng vai trò là một **Event Publisher & Ingestion Manager**:

- **SQS Ingestion Queue**: `food-delivery-orders` (Bộ đệm tiếp nhận đơn từ khách hàng, TTL message 300s).
- **SNS Driver Dispatch Topic**: `order-driver-dispatch` (Fanout các chuyến xe `READY_FOR_PICKUP` tới các tài xế).
- **SQS Driver Dispatch Queue**: `driver-dispatch-queue` (Subscribed tới Topic `order-driver-dispatch`).

### Danh Mục Sự Kiện & Thông Điệp

| Kênh Truyền | Tên Sự Kiện / Message | Điều kiện phát | Payload tóm tắt |
| :--- | :--- | :--- | :--- |
| **SQS Queue** | `ORDER_CREATED` | Khi khách hàng gửi `POST /orders` | `{ orderId, restaurantId, customerId, items, totalAmount, deliveryAddress }` |
| **SNS Topic** | `ORDER_READY_FOR_PICKUP` | Khi nhà hàng xong món cần tài xế | `{ orderId, restaurantId, restaurantName, customerId, items, deliveryAddress, totalAmount }` |
| **SQS Queue** | `ORDER_STATUS_CHANGED` | Khi đơn chuyển trạng thái bất kỳ | `{ orderId, previousStatus, newStatus, changedAt, changedBy }` |
| **Redis Pub/Sub** | `order:events:{id}` | Phát tức thì khi trạng thái đơn thay đổi cho luồng SSE client (`text/event-stream`) | `InflightOrderData` / Snapshot đơn hàng mới |
| **PostgreSQL** | `DATABASE_PERSISTED` | Khi tài xế xác nhận `COMPLETED` | Ghi transaction toàn bộ `t_order` và `t_order_item` |

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
        numeric delivery_lat "numeric(10,8) Tọa độ vĩ độ điểm giao hàng"
        numeric delivery_lng "numeric(11,8) Tọa độ kinh độ điểm giao hàng"
        varchar recipient_name "varchar(255) Tên người nhận snapshot"
        varchar recipient_phone "varchar(50) SĐT người nhận snapshot"
        text note
        timestamptz estimated_delivery_time
        varchar payment_method "Mặc định CASH"
        timestamptz cooking_at "Thời điểm bắt đầu nấu"
        timestamptz ready_at "Thời điểm nấu xong"
        timestamptz driver_claimed_at "Thời điểm tài xế nhận cuốc"
        timestamptz completed_at "Thời điểm giao hàng thành công"
        timestamptz cancelled_at "Thời điểm hủy đơn"
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
   - **Mốc thời gian theo từng Actor (Role-based Milestones)**:
     - `cooking_at`: Bếp bắt đầu chế biến món ăn.
     - `ready_at`: Bếp nấu xong, phát tín hiệu tìm tài xế.
     - `driver_claimed_at`: Tài xế nhận cuốc (Dùng làm mốc tính thời lượng cuốc xe `duration_minutes`).
     - `completed_at`: Tài xế giao thành công cho khách hàng.
     - `cancelled_at`: Thời điểm hủy đơn nếu có.
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
