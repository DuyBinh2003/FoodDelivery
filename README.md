# 🍔 Food Delivery System (Microservices Architecture)

Dự án cá nhân xây dựng hệ thống đặt đồ ăn (Food Delivery) theo kiến trúc **Microservices + Event-Driven**. Bám sát các tiêu chuẩn thực tế trên môi trường Cloud.

**Tech Stack:**
- **Frontend:** Next.js + TypeScript + Tailwind CSS (App Router)
- **Backend:** Node.js + NestJS + TypeScript (Monorepo Microservices Workspace)
- **Database & Cache:** PostgreSQL (Schema-per-service) + Redis + Elasticsearch
- **Messaging:** Amazon SNS/SQS (LocalStack trên dev)
- **Infrastructure:** Docker Compose (Full Stack) + NGINX (API Gateway)

---

## 🏗️ Kiến Trúc Hệ Thống

```mermaid
graph TD
    subgraph "Clients"
        FE["📱 Next.js Frontend :3000"]
    end

    subgraph "API Gateway (Docker)"
        GW["🚪 NGINX :3000\nRoute by /api/v1/[service]/*"]
    end

    subgraph "Microservices (NestJS Docker)"
        US["👤 User Service :3001"]
        AS["🛡️ Admin Service :3002"]
        RS["🏪 Restaurant Service :3003"]
        OS["🛒 Order Service :3004"]
        DS["🛵 Delivery Service :3005"]
        SS["🔍 Search Service :3006"]
        PS["💳 Payment Service :3007"]
    end

    subgraph "Messaging (LocalStack)"
        SNS["📢 SNS Topics"]
        SQS["📥 SQS Queues"]
    end

    subgraph "Data Layer (Docker)"
        DB[("PostgreSQL\nschema-per-service")]
        Redis[("Redis\nCache + Geo")]
        ES[("Elasticsearch\nSearch Index")]
    end

    FE --> GW
    GW --> US & AS & RS & OS & DS & SS & PS

    US -.->|"schema_user"| DB
    AS -.->|"public"| DB
    RS -.->|"schema_restaurant"| DB
    OS -.->|"schema_order"| DB
    PS -.->|"schema_payment"| DB

    US -->|"Publish Registration"| SNS --> SQS
    OS -->|"Publish Order"| SNS
    SQS -->|"Consume"| AS & DS
    
    AS -.->|"Internal HTTP"| US & RS & OS & DS
    OS -.->|"Internal HTTP"| RS
    SS -.->|"Internal HTTP"| RS
```

> 📖 **Xem kiến trúc chi tiết:** [`docs/architecture/system-architecture.md`](./docs/architecture/system-architecture.md)
> 📚 **Trung tâm tài liệu toàn dự án:** [`docs/README.md`](./docs/README.md)


## 🛣️ Lộ Trình Phát Triển (Đã Hoàn Thành Migration)

Chúng ta đã hoàn tất việc chia tách dự án từ Monolith sang Microservices chuẩn mực:

- **Phase 1: Cấu trúc thư mục (Monorepo)** ✅
  - Chuyển source code sang `apps/` và `libs/`
  - Tách DB Schema Isolation (`schema-per-service`)
- **Phase 2: Xoá Cross-module Dependency** ✅
  - Loại bỏ các `@InjectRepository` gọi chéo
- **Phase 3: Internal API Endpoints** ✅
  - Sử dụng REST API (fetch) để giao tiếp nội bộ thay vì TypeORM trực tiếp
- **Phase 4: Event Contract Library** ✅
  - Đóng gói giao thức sự kiện (Event Types) vào `libs/events/` để gửi nhận SQS/SNS
- **Phase 5: Docker Compose Full Stack** ✅
  - Tạo `Dockerfile` chuẩn cho toàn bộ 6 service
  - Triển khai full stack bằng Docker Network
- **Phase 6: API Gateway** ✅
  - Triển khai NGINX làm Reverse Proxy (`gateway/nginx.conf`)
- **Phase 7: Kênh Đối Tác / Quản Lý Nhà Hàng (Merchant Portal)** ✅
  - Bật/tắt mở bán nhận đơn theo thời gian thực (`is_active`)
  - Quản lý thực đơn: CRUD món ăn, điều chỉnh giá bán, bật/tắt còn món (`is_available`), phân loại danh mục (`m_category`) và gán nhãn tags (`m_tag`)
  - Tích hợp bảo vệ giỏ hàng và đặt món tại `order-service` khi quán đóng cửa
  - Giao diện quản lý chuyên nghiệp tại `/partner/restaurant`
- **Phase 8: Đối Tác Tài Xế & Chuẩn Hóa Quan Hệ DB 1-1 (Issue #49)** ✅
  - Hỗ trợ luồng đăng ký tài xế chuyên biệt tại `/register/driver` và Cổng đối tác tại `/register`
  - Tái sử dụng trọn vẹn hạ tầng Event-Driven (SNS/SQS) và WebSockets realtime từ luồng nhà hàng
  - Chặn đăng ký lần 2 báo lỗi HTTP 409 Conflict (1 User tối đa 1 Nhà hàng và 1 Tài xế, cho phép nộp lại khi bị từ chối)
  - Chuẩn hóa quan hệ 1-1: Thiết lập ràng buộc `UNIQUE` trên `m_restaurant.owner_id` và `m_driver_profile.user_id`
  - Tích hợp xét duyệt tài xế và kích hoạt hồ sơ tự động tại Admin Portal (`/admin/approvals`)
- **Phase 9: Quản Lý Navbar Thông Minh & Cổng Thông Tin Tài Xế (Driver Portal)** ✅
  - Ẩn/hiện thông minh các nút Đăng ký tài xế / Đăng ký nhà hàng dựa theo hồ sơ thực tế và trạng thái xét duyệt
  - Cung cấp Cổng thông tin tài xế chuyên biệt tại `/driver/dashboard`:
    - Bật/tắt trạng thái hoạt động (Trực tuyến / Ngoại tuyến - Online/Offline) với animation xung nhịp hiện đại
    - Thống kê tổng quan thu nhập, cuốc xe hoàn thành, đánh giá sao và cuốc xe trong ngày
    - Lịch sử chuyến đi chi tiết: Điểm đón (Quán ăn) ➡️ Điểm đến (Khách hàng), tiền nhận được (+VNĐ), danh sách món ăn, và trạng thái cuốc xe
    - Xem đánh giá của khách hàng: Điểm rating 1 - 5 sao, thanh phân bổ sao và nhận xét chi tiết
- **Phase 10: Dịch Vụ Thanh Toán & Sổ Cái Cốt Lõi (Core Payment & Ledger System - Sprint 1)** ✅
  - Triển khai Microservice độc lập `payment-service` (:3007) và Schema PostgreSQL riêng biệt `schema_payment`
  - Thiết kế sổ cái kế toán kép (**Double-Entry Bookkeeping**) chuẩn FinTech, lưu trữ **Append-Only** (`t_ledger_transaction`, `t_ledger_entry`)
  - Quản lý tài khoản ví 4 chủ thể: Khách hàng, Tài xế, Nhà hàng, Nền tảng (`m_wallet_account`, `m_wallet_balance`)
  - Bảo đảm bất biến tuyệt đối `sum(DEBIT) == sum(CREDIT)` bằng `Decimal.js` và khóa bi quan (`SELECT FOR UPDATE`)
  - Cơ chế cấn trừ đơn COD và xử lý số dư âm tạm thời của Tài xế (tự động gắn cờ `isDriverInactive` bảo vệ nền tảng)
  - 100% kiểm thử tự động với Vitest và tài liệu chi tiết tại [`docs/services/payment-service.md`](./docs/services/payment-service.md)
- **Phase 11: Vận Hành Đơn Bếp & Điều Phối Giao Hàng (Restaurant & Driver Fulfillment - Issue #55)** ✅
  - Nhà hàng tiếp nhận đơn và quản lý đơn bếp thời gian thực tại Merchant Portal (`/partner/restaurant`): Tab "Đơn bếp", xem chi tiết đơn hàng, chuyển trạng thái chế biến (`COOKING` ➡️ `READY_FOR_PICKUP`).
  - Tài xế nhận cuốc xe và vận hành chuyến đi tại Driver Portal (`/driver/dashboard`): Xem danh sách chuyến sẵn sàng nhận (`AVAILABLE`), nhận cuốc xe (`CLAIM`), cập nhật trạng thái di chuyển (`DELIVERING` ➡️ `COMPLETED`).
  - Quản lý mốc thời gian luân chuyển đơn hàng (**Order Milestones**): `cooking_at`, `ready_at`, `driver_claimed_at`, `completed_at`, `cancelled_at` đồng bộ giữa Redis In-flight cache và PostgreSQL.
  - Kiểm thử tự động với Vitest bao phủ 100% luồng nghiệp vụ: `order-milestones.spec.ts` và `driver-active-dispatch.spec.ts`.
- **Phase 12: Kiến Trúc Xử Lý Lỗi Toàn Diện & Chuẩn Hóa CI/CD (Full-Stack Error Handling & CI/CD Pipeline - Issue #57)** ✅
  - **Backend**: Triển khai bộ lọc ngoại lệ toàn cục `GlobalExceptionFilter` tại `libs/common/src/filters/`, áp dụng cho toàn bộ 7 Microservices; chuẩn hóa cấu trúc lỗi `ErrorResponseBody`, che giấu lỗi database nhạy cảm (HTTP 500), bảo toàn root cause qua Logger và xử lý lỗi validate từ `ValidationPipe`.
  - **Frontend**:
    - Chuẩn hóa tầng mạng `apiClient` và lớp ngoại lệ `ApiError` với thông điệp tiếng Việt thân thiện, tự động xử lý hết hạn phiên (HTTP 401) và chuyển hướng đăng nhập thông minh.
    - Xây dựng hệ thống Error Boundary phân cấp: `error.tsx` (Route-level), `global-error.tsx` (Root-level), trang 404 phong cách ẩm thực (`not-found.tsx`).
    - Component giao diện dự phòng `ErrorState` tái sử dụng với nút "Thử lại" (Retry action).
    - Cấu hình môi trường nghiêm ngặt (**Fail-Fast**): Cơ chế `requireEnv` kiểm tra biến môi trường khi build, cấm fallback ngầm và cấm dữ liệu giả trong UI.
  - **CI/CD Pipeline**: Hoàn thiện GitHub Actions workflow (`ci-cd.yml`) tự động hóa kiểm tra: Oxlint + Absolute Import check, Vitest unit test (Backend) và ESLint + Next.js Production Build (Frontend) với tỷ lệ pass 100%.
- **Phase 13: Quản Lý Sổ Địa Chỉ & Tính Toán Lộ Trình Driver (Issue #18)** ✅
  - **Quản lý Sổ địa chỉ đa năng (`schema_user.m_user_address`)**: Hỗ trợ người dùng lưu nhiều địa chỉ nhận hàng với nhãn định danh (`HOME`, `WORK`, `OTHER`), tự động chuyển đổi địa chỉ mặc định duy nhất (`is_default`), lưu trữ tọa độ chuẩn WGS84 (`latitude: numeric(10,8)`, `longitude: numeric(11,8)`).
  - **Bản đồ tương tác không phụ thuộc API key**: Tích hợp Leaflet + OpenStreetMap + OpenStreetMap Nominatim reverse geocoding trên Frontend, hỗ trợ tìm kiếm địa điểm autocomplete, kéo thả ghim vị trí và lấy tọa độ GPS từ thiết bị qua Geolocation API.
  - **Snapshot đơn hàng bất biến (Immutable Order Snapshot)**: Snapshot trực tiếp thông tin người nhận (`recipient_name`, `recipient_phone`) và tọa độ giao hàng (`delivery_lat`, `delivery_lng`) vào `schema_order.t_order` và Redis In-flight cache khi khách hàng đặt đơn tại `/checkout`.
  - **Tính toán khoảng cách lộ trình (Haversine Formula)**: Triển khai tiện ích `calculateHaversineDistanceKm` tính toán khoảng cách thực tế giữa Nhà hàng và Điểm giao hàng; bổ sung trường `distance_km` trong `DriverTripDto` và hiển thị huy hiệu cự ly trên Driver Portal (`/driver/dashboard`) phục vụ phân bổ cuốc xe tối ưu.
  - **Trải nghiệm người dùng cao cấp**: Trang quản lý Sổ địa chỉ riêng biệt tại `/profile/addresses`, modal chọn địa chỉ tích hợp trực tiếp tại `/checkout` (`AddressSelectorModal`), thiết kế hiện đại Dark theme theo tôn chỉ UI/UX Pro Max.
  - **Kiểm thử tự động & Tài liệu hóa**: Bổ sung bộ kiểm thử Vitest toàn diện (`user-address.spec.ts`, `order-distance-calculation.spec.ts`) đạt 100% pass; cập nhật đầy đủ tài liệu kỹ thuật tại [`docs/features/customer/address-book.md`](./docs/features/customer/address-book.md).

---

## 🚀 Khởi Động Hệ Thống (Local Development)

### Cách 1: Chạy Full Stack trên Docker (Recommended cho Test)
Chỉ với 1 lệnh, toàn bộ hạ tầng và 6 microservices + API Gateway sẽ được khởi chạy độc lập:

```bash
docker compose up -d --build
```
*API Gateway sẽ mở tại: `http://localhost:3000`*

### Cách 2: Chạy Local Development (Hot-reload từng Service)
Nếu bạn muốn code và xem thay đổi ngay lập tức trên máy:
```bash
# 1. Khởi động hạ tầng (DB, Redis, Localstack) - Lưu ý comment các service backend trong file docker-compose nếu bị trùng port
docker compose up -d db redis localstack elasticsearch

# 2. Chạy lần lượt các microservice cần thiết trong terminal riêng:
cd backend
npx nest start user-service --watch
npx nest start admin-service --watch
# ...
```

---

## 📁 Cấu Trúc Thư Mục Mới

```
FoodDelivery/
├── frontend/               # Next.js App (App Router, Tailwind CSS)
├── backend/                # NestJS Monorepo
│   ├── apps/               # Các Microservices độc lập
│   │   ├── admin-service/
│   │   ├── delivery-service/
│   │   ├── order-service/
│   │   ├── payment-service/
│   │   ├── restaurant-service/
│   │   ├── search-service/
│   │   └── user-service/
│   ├── libs/               # Thư viện dùng chung
│   │   ├── common/         # Decorators, Guards, Enums, Messaging SQS/SNS
│   │   ├── config/         # Cấu hình TypeORM, AWS
│   │   └── events/         # Event Contracts, Types
│   ├── Dockerfile          # Generic Dockerfile cho mọi service
│   └── nest-cli.json
├── docs/                   # Trung tâm tài liệu chuẩn hóa
│   ├── architecture/       # Kiến trúc & Hạ tầng hệ thống
│   ├── services/           # Đặc tả 7 Microservices & API Contracts
│   ├── business/           # Chiến lược & Lộ trình sản phẩm
│   ├── features/           # Đặc tả tính năng (Customer, Partner, Driver)
│   └── frontend/           # Quy chuẩn kiến trúc & UI/UX Next.js
├── gateway/
│   └── nginx.conf          # NGINX API Gateway Config
├── scripts/
│   └── localstack-init.sh  # Tự động tạo SNS Topics + SQS Queues
└── docker-compose.yml      # Hạ tầng & Toàn bộ Microservices + Gateway
```

