# 🏗️ System Architecture — Food Delivery

Tài liệu này là **nguồn chân lý duy nhất (Single Source of Truth)** mô tả toàn bộ kiến trúc kỹ thuật của hệ thống Food Delivery. Mọi quyết định thiết kế, pattern được lựa chọn và lý do đằng sau đều được ghi nhận tại đây.

---

## 1. Tổng Quan Kiến Trúc (High-Level Overview)

Hệ thống được xây dựng theo mô hình **Microservices** với **Event-Driven Architecture** cho giao tiếp bất đồng bộ giữa các services. Mỗi service sở hữu database schema độc lập, giao tiếp với nhau qua HTTP (đồng bộ) hoặc SNS/SQS (bất đồng bộ).

```mermaid
graph TD
    subgraph "Clients"
        CA["📱 Customer App\n(Next.js)"]
        DA["🛵 Driver App\n(Mobile/Web)"]
        RP["💻 Restaurant Portal\n(Next.js)"]
        AD["👑 Admin Dashboard\n(Next.js)"]
    end

    subgraph "Entry Point"
        GW["🛡️ NGINX Unified Reverse Proxy\n(Port 8080)\nSame-Origin + CORS + Rate Limit + WS"]
    end

    subgraph "Frontend & Microservices Layer"
        FE["🌐 Next.js Frontend\n(Port 3000)\nSSR + App Router + /api/health"]
        US["👤 User Service\n(NestJS, Port 4001)\nAuth + Registration + Loyalty"]
        AS["👑 Admin Service\n(NestJS, Port 4002)\nApprovals + Disputes + Config"]
        RS["🏪 Restaurant Service\n(NestJS, Port 4003)\nMenu + Store Management"]
        OS["📦 Order Service\n(NestJS, Port 4004)\nOrder State Machine + Vouchers"]
        DS["🛵 Delivery Service\n(NestJS, Port 4005)\nDispatch + GPS Tracking + OSRM"]
        SS["🔍 Search Service\n(NestJS, Port 4006)\nElasticsearch Integration"]
        PS["💳 Payment Service\n(NestJS, Port 4007)\nDouble-Entry Ledger + Wallets"]
        AI["🤖 AI Service & Core\n(NestJS :5001 / Python :5002)\nSSE Chatbox + LangGraph CRAG"]
    end

    subgraph "Messaging Layer (AWS / LocalStack)"
        SNS["📢 Amazon SNS\nEvent Publisher\n(Fan-out)"]
        SQS_A["📨 SQS: admin-registration-queue"]
        SQS_O["📨 SQS: food-delivery-orders"]
        SQS_D["📨 SQS: driver-notifications"]
    end

    subgraph "Data Layer (Docker)"
        DB[("🗄️ PostgreSQL\nSchema-per-Service\n(Port 5432)")]
        Redis[("⚡ Redis\nCache + Geo\n(Port 6379)")]
        ES[("🔍 Elasticsearch\nSearch Index\n(Port 9200)")]
    end

    %% Client -> Gateway
    CA & DA & RP & AD -->|"Same-Origin :8080"| GW

    %% Gateway -> Frontend & Services
    GW -->|"/* , /_next/* , /api/health , /api/routing"| FE
    GW -->|"/api/users|auth|loyalty , /ws/user/socket.io"| US
    GW -->|"/api/admin|disputes , /ws/admin/socket.io"| AS
    GW -->|"/api/restaurants/*"| RS
    GW -->|"/api/orders|vouchers/*"| OS
    GW -->|"/api/delivery/* , /ws/delivery/socket.io"| DS
    GW -->|"/api/search/*"| SS
    GW -->|"/api/wallets|payment|ledger/*"| PS
    GW -->|"/api/ai/* (SSE)"| AI

    %% Services -> DB (Schema Isolated)
    US -->|"schema_user"| DB
    AS -->|"public (m_system_config)"| DB
    RS -->|"schema_restaurant"| DB
    OS -->|"schema_order"| DB

    %% Event Publishing
    US -->|"Publish: RegistrationCreated"| SNS
    OS -->|"Publish: OrderCreated"| SNS

    %% SNS -> SQS Fan-out
    SNS --> SQS_A
    SNS --> SQS_O
    SNS --> SQS_D

    %% SQS -> Consumers
    SQS_A -->|"Consume"| AS
    SQS_O -->|"Consume"| DS
    SQS_D -->|"Consume"| DS

    %% Cache & Search
    DS <-->|"Geo Location"| Redis
    OS <-->|"Cart/Session"| Redis
    RS -->|"Sync Index"| ES
    SS -->|"Query"| ES
```

---

## 2. Phân Chia Services (Service Boundaries)

| Service | Port | Trách nhiệm | Database Schema | Publisher | Consumer |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **NGINX Unified Gateway** | 8080 | Reverse Proxy, Same-Origin `/api/*` & `/ws/*`, CORS, Rate Limit | — | — | — |
| **Next.js Frontend** | 3000 | Customer, Driver, Merchant, Admin UI + `/api/health`, `/api/routing` | — | — | — |
| **User Service** | 4001 | Đăng ký, đăng nhập, JWT auth, profile, loyalty points | `schema_user` | `RegistrationCreated` | — |
| **Admin Service** | 4002 | Xét duyệt hồ sơ, khiếu nại (disputes), cấu hình hệ thống | `public` | — | `admin-registration-queue` |
| **Restaurant Service** | 4003 | Quản lý nhà hàng, menu, options, giờ hoạt động | `schema_restaurant` | `RestaurantUpdated` | — |
| **Order Service** | 4004 | Tạo đơn, vouchers, state machine trạng thái, SQS buffer | `schema_order` | `OrderCreated` | — |
| **Delivery Service** | 4005 | Dispatch tài xế, GPS realtime, OSRM routing, WebSocket | `schema_delivery` | `DriverAssigned` | `food-delivery-orders` |
| **Search Service** | 4006 | Full-text search, geo-search nhà hàng/món ăn | — (Elasticsearch) | — | `restaurant-updates` |
| **Payment Service** | 4007 | Sổ cái kép (Double-Entry Ledger), ví 4 chủ thể, COD | `schema_payment` | — | — |
| **AI Service (NestJS)** | 5001 | Chatbox Orchestrator, SSE streaming, Session DB | `schema_ai` | — | — |
| **AI Python (LangGraph)** | 5002 | CRAG Pipeline, pgvector + Elasticsearch RAG | `schema_ai` | — | — |

---

## 3. Database Strategy (Schema-per-Service)

Tất cả services dùng chung **1 PostgreSQL instance** nhưng tách biệt nhau bằng **schema riêng**. Không service nào được phép query trực tiếp schema của service khác.

```
PostgreSQL (food_delivery database)
├── public                    → Admin: m_system_config
├── schema_user               → User Service: m_user, m_customer_profile, m_driver_profile, t_registration_request
├── schema_restaurant         → Restaurant Service: m_restaurant, m_menu_item, m_category
├── schema_order              → Order Service: t_order, t_order_item, t_order_review
├── schema_delivery           → Delivery Service: dispatch & tracking state
└── schema_payment            → Payment Service: m_wallet, t_ledger_entry, t_idempotency_key
```

> **Nguyên tắc Cross-service Data:** Không dùng FK hoặc JOIN qua schema. Chỉ lưu `UUID` của entity bên kia (Logical Reference). Để lấy data của service khác, phải gọi HTTP nội bộ hoặc nhận qua Event.

---

## 4. Event-Driven Communication (SNS/SQS)

### Khi nào dùng Event (Async) vs HTTP (Sync)?

| Tiêu chí | HTTP (Sync) | SNS/SQS (Async) |
| :--- | :--- | :--- |
| **Cần kết quả ngay** | ✅ Dùng HTTP | ❌ |
| **Side effect / Notification** | ❌ | ✅ Dùng Event |
| **Giao tiếp fan-out (1 → N)** | ❌ | ✅ SNS phù hợp |
| **Chịu được độ trễ** | ❌ | ✅ |
| **Fault tolerance (service crash)** | ❌ Mất request | ✅ Message nằm trong Queue |

### Event Map

| Event | Publisher | SQS Queue | Consumers |
| :--- | :--- | :--- | :--- |
| `RegistrationCreated` | User Service | `admin-registration-queue` | Admin Service |
| `OrderCreated` | Order Service | `food-delivery-orders` | Driver Service |
| `DriverAssigned` | Driver Service | `driver-notifications` | Order Service |
| `RestaurantUpdated` | Restaurant Service | `search-index-queue` | Search Service |

### Event Message Contract

Mọi event publish lên SNS phải tuân theo interface sau (định nghĩa trong `libs/events/`):

```typescript
interface BaseEvent<T> {
  eventType: string;       // VD: 'RegistrationCreated'
  version: string;         // VD: '1.0' — để versioning event schema
  timestamp: string;       // ISO 8601
  data: T;
}
```

---

## 5. Real-time Communication (WebSockets)

WebSocket được dùng cho các tính năng cần push ngay lập tức tới Client mà không cần Client phải request:

| Gateway | Service & Port | Path & Namespace | Event phát ra | Receiver |
| :--- | :--- | :--- | :--- | :--- |
| `UserGateway` | User Service (:4001) | `/ws/user/socket.io` (ns `/user`) | `registration_result` | Customer / Partner |
| `AdminGateway` | Admin Service (:4002) | `/ws/admin/socket.io` (ns `/admin`) | `new_registration` | Admin Dashboard |
| `TrackingGateway` | Delivery Service (:4005) | `/ws/delivery/socket.io` (ns `/delivery`) | `driver:trip_offer`, `driver_location_updated` | Driver & Customer App |

**Flow:** SQS Consumer (nhận message từ Queue) → emit WebSocket event → Frontend invalidate React Query cache và hiện Toast.

---

## 6. Frontend Architecture (Hybrid Pattern)

Frontend dùng **3 pattern fetch** tùy theo ngữ cảnh:

| Pattern | Khi nào dùng | Ví dụ |
| :--- | :--- | :--- |
| **RSC Fetch** (Server Component) | Trang public cần SEO | Danh sách nhà hàng, chi tiết menu |
| **CSR Fetch** (React Query) | Mutation, data cá nhân | Đặt món, login, cập nhật profile |
| **WebSocket** (Socket.io) | Real-time push | Trạng thái đơn hàng, vị trí tài xế, notification Admin |

---

## 7. Infrastructure (Docker)

Toàn bộ hạ tầng được chạy qua `docker-compose.yml`. Backend và Frontend được chạy local (HMR) để tốc độ dev nhanh nhất, kết nối vào các containers qua port đã expose.

| Service | Container | Port | Vai trò |
| :--- | :--- | :--- | :--- |
| PostgreSQL | `food_delivery_db` | 5432 | Primary database |
| Redis | `food_delivery_redis` | 6379 | Cache, session, geo-data |
| Elasticsearch | `food_delivery_elasticsearch` | 9200 | Search index |
| LocalStack | `food_delivery_localstack` | 4566 | Mock AWS SNS + SQS |

> **LocalStack Init:** File `scripts/localstack-init.sh` tự động chạy khi container LocalStack ready để tạo đủ Topics và Queues. Backend và Frontend **không** chạy trong Docker khi phát triển (để tận dụng HMR).

---

## 8. Lộ Trình Migration (Monolith → Microservices)

Hiện tại codebase đang ở giai đoạn **Modular Monolith** (tất cả modules trong 1 NestJS process). Lộ trình tách ra Microservices thực sự theo thứ tự:

```
Phase 0: Fix LocalStack init → SNS/SQS hoạt động đúng
Phase 1: Xoá cross-module imports trong AdminModule
Phase 2: Tách services/ directory (mỗi service = 1 package.json riêng)
Phase 3: Chuẩn hoá Event Contract trong libs/events/
Phase 4: Thêm NGINX API Gateway vào docker-compose
```

*(Chi tiết xem: [`docs/architecture/migration-plan.md`](./migration-plan.md))*
