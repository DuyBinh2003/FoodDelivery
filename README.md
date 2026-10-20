<div align="center">

# 🍔 Food Delivery System

**Hệ thống đặt đồ ăn trực tuyến toàn diện theo kiến trúc Microservices & Event-Driven**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS_LocalStack-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://localstack.cloud/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)](https://www.elastic.co/)

<p>
  <a href="#-giới-thiệu">Giới thiệu</a> •
  <a href="#%EF%B8%8F-kiến-trúc-hệ-thống">Kiến trúc</a> •
  <a href="#-tính-năng">Tính năng</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-khởi-động-nhanh">Khởi động</a> •
  <a href="#-cấu-trúc-dự-án">Cấu trúc</a> •
  <a href="#-tài-liệu">Tài liệu</a>
</p>

</div>

---

## 📖 Giới Thiệu

**Food Delivery System** là dự án cá nhân mô phỏng nền tảng giao đồ ăn quy mô doanh nghiệp (tương tự GrabFood, ShopeeFood) được xây dựng theo kiến trúc **Microservices + Event-Driven Architecture**. Dự án bám sát các tiêu chuẩn kỹ thuật thực tế trên môi trường Cloud và phục vụ **4 nhóm người dùng** độc lập: Khách hàng, Đối tác Nhà hàng, Đối tác Tài xế và Quản trị viên.

> **Mục tiêu kỹ thuật:** Chứng minh khả năng thiết kế và triển khai một hệ thống phân tán hoàn chỉnh, giải quyết các bài toán khó như: đảm bảo tính nhất quán dữ liệu giữa các service, xử lý đơn hàng bất đồng bộ chịu tải cao, tính toán địa lý thời gian thực và hệ thống kế toán tài chính chuẩn FinTech.

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                │
│   📱 Customer App   💻 Partner Portal   🛵 Driver App   👑 Admin │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  🚪 NGINX API Gateway (:3000)                    │
│               Route by path prefix  /api/v1/[service]/*          │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────────┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
 :3001  :3002  :3003  :3004  :3005  :3006  :3007
  👤     👑     🏪     🛒     🛵     🔍     💳
 User  Admin  Rest.  Order  Driver Search  Pay.
  Svc   Svc   Svc    Svc    Svc    Svc    Svc
         │      │      │      │
         │  ────┼──────┼──────┼──► 📢 Amazon SNS/SQS (LocalStack)
         │      │      │      │
         ▼      ▼      ▼      ▼
  ┌──────────────────────────────────┐
  │  🗄️  PostgreSQL  (Schema/Svc)    │
  │  ⚡  Redis       (Cache + Geo)   │
  │  🔍  Elasticsearch (Search)      │
  │  🪣  LocalStack S3 (Assets)      │
  └──────────────────────────────────┘
```

> 📖 **Xem chi tiết:** [`docs/architecture/system-architecture.md`](./docs/architecture/system-architecture.md)

### Phân Chia Services & Port Mapping

| Service | Port | Database Schema | Trách nhiệm chính |
|:---|:---:|:---|:---|
| **User Service** | 3001 | `schema_user` | Auth (JWT), profile, loyalty points, đăng ký đối tác |
| **Admin Service** | 3002 | `public` | KYC duyệt hồ sơ, metrics dashboard, cấu hình hệ thống |
| **Restaurant Service** | 3003 | `schema_restaurant` | Quản lý nhà hàng, thực đơn, tags, categories |
| **Order Service** | 3004 | `schema_order` | State machine đơn hàng, SQS FIFO buffer, Redis in-flight |
| **Delivery Service** | 3005 | `schema_delivery` | GPS tracking, Geospatial dispatch, OSRM routing |
| **Search Service** | 3006 | — (Elasticsearch) | Full-text search, geo-search nhà hàng/món ăn |
| **Payment Service** | 3007 | `schema_payment` | Double-Entry Ledger, ví 4 chủ thể, COD settlement |

---

## ✨ Tính Năng

### 🧑 Phân Hệ Khách Hàng (Customer Experience)

| Tính năng | Mô tả |
|:---|:---|
| **Trang chủ cá nhân hóa** | 4 feed cá nhân hóa, banner carousel, infinite scroll, bộ chọn địa chỉ GPS |
| **Tìm kiếm thông minh** | Elasticsearch full-text + bộ lọc đa chiều (danh mục, khoảng cách, freeship, đánh giá) |
| **Giỏ hàng nâng cao** | Single Restaurant Policy, tự động kiểm tra giá/trạng thái quán, lưu localStorage |
| **Menu tương tác** | Sticky Category Scroll Spy 2 chiều, modifier popup realtime, floating cart |
| **Sổ địa chỉ GPS** | Leaflet + OpenStreetMap, reverse geocoding Nominatim (miễn phí), nhãn HOME/WORK/OTHER |
| **Hệ thống điểm thưởng** | Tích điểm đa tầng (1.0x–2.0x), quy đổi tại checkout (1 điểm = 10 VND, trần 50%) |
| **Theo dõi đơn realtime** | Bản đồ Leaflet hiển thị vị trí tài xế di chuyển qua WebSocket |

### 🏪 Phân Hệ Đối Tác Nhà Hàng (Merchant Portal)

| Tính năng | Mô tả |
|:---|:---|
| **Kitchen Display System** | Màn hình đơn hàng realtime `/partner/restaurant`: PENDING → COOKING → READY_FOR_PICKUP |
| **Quản lý thực đơn** | CRUD món ăn đầy đủ, Tags & Options Builder, giá gốc/khuyến mãi, toggle hết hàng |
| **Upload ảnh S3** | Tải ảnh món ăn và banner lên LocalStack S3 trực tiếp, loại bỏ hoàn toàn hardcode URL |
| **Đăng ký mở quán** | Nộp hồ sơ trực tuyến, nhận thông báo duyệt realtime qua WebSocket |

### 🛵 Phân Hệ Đối Tác Tài Xế (Driver Portal & Dispatch)

| Tính năng | Mô tả |
|:---|:---|
| **Dispatch thông minh** | Redis Geospatial GEORADIUS tìm tài xế gần nhất 5km, WebSocket ping countdown 15s |
| **GPS Realtime (OSRM)** | Định tuyến đường phố thực tế, Polyline turn-by-turn, GPS Simulator bám cua đường |
| **Redis Atomic Lock** | `SETNX` chống race condition khi nhiều tài xế cùng bấm nhận một cuốc |
| **Báo cáo thu nhập** | Thống kê doanh thu ngày/tuần, lịch sử chuyến, huy hiệu cự ly `distance_km` |

### 💳 Thanh Toán & Kế Toán Kép (FinTech Core)

| Tính năng | Mô tả |
|:---|:---|
| **Double-Entry Bookkeeping** | Sổ cái Append-Only (`t_ledger_entry`), bất biến `sum(DEBIT) == sum(CREDIT)` |
| **Ví 4 chủ thể** | Khách hàng, Tài xế, Nhà hàng, Platform — phân lập hoàn toàn tại `schema_payment` |
| **COD & Thấu chi** | Cấn trừ tự động COD, khóa tài xế khi âm ví vượt ngưỡng (`isDriverInactive = true`) |
| **Idempotency** | `t_idempotency_key` chống duplicate charges, số học chính xác với `Decimal.js` |
| **Chiết khấu tự động** | Tự động trích 15–20% hoa hồng nhà hàng và 10% hoa hồng tài xế mỗi cuốc xe |

### 👑 Phân Hệ Quản Trị (Admin Enterprise Portal)

| Tính năng | Mô tả |
|:---|:---|
| **Dashboard Recharts** | 5 thẻ KPI tài chính, AreaChart xu hướng GMV, DonutChart phân bổ doanh thu |
| **Platform Treasury Wallet** | Ví sàn `SYS_REVENUE_PLATFORM_COMMISSION`, sổ cái kép minh bạch |
| **Quản lý giao dịch** | Đối soát đơn hàng + cuốc xe, cự ly GPS thực tế, vòng đời đơn đầy đủ |
| **Phê duyệt đối tác (KYC)** | Duyệt/từ chối hồ sơ nhà hàng & tài xế kèm lý do, kích hoạt tài khoản tự động |
| **Graceful Degradation** | Fallback snapshot an toàn khi nội bộ gián đoạn, không crash UI dashboard |

---

## 🔧 Tech Stack

### Backend

| Thành phần | Công nghệ | Mục đích |
|:---|:---|:---|
| **Framework** | NestJS 12 + TypeScript Strict | Modular architecture, Dependency Injection |
| **Database** | PostgreSQL 15 (Schema-per-Service) | Phân lập dữ liệu biệt lập theo từng service |
| **ORM** | TypeORM + node-pg-migrate | Data access layer & schema migrations |
| **Cache & Geo** | Redis 7 | In-flight order state, Geospatial dispatch, Atomic Lock |
| **Search** | Elasticsearch 8 | Full-text search & geo-search nhà hàng/món ăn |
| **Messaging** | Amazon SNS/SQS via LocalStack | Event-Driven fan-out & FIFO queue buffer |
| **Storage** | LocalStack AWS S3 | Assets: avatar, ảnh món ăn, banner nhà hàng |
| **Auth** | Passport-JWT + JwtAuthGuard | Stateless authentication, Bearer token |
| **Map Routing** | OSRM (Open Source Routing Machine) | Định tuyến đường phố thực tế cho tài xế |
| **FinTech** | Decimal.js + SELECT FOR UPDATE | Số học chính xác, khóa bi quan chống race condition |
| **Testing** | Vitest | Unit test 3 nhánh: Happy / Edge Cases / Error Flow |

### Frontend

| Thành phần | Công nghệ | Mục đích |
|:---|:---|:---|
| **Framework** | Next.js 15 (App Router) | SSR / ISR / CSR hybrid fetching |
| **Language** | TypeScript Strict | Type-safe toàn diện, không `any` |
| **Styling** | Tailwind CSS | Utility-first, design system token |
| **Server State** | React Query (TanStack) | Cache, invalidation, optimistic update |
| **Client State** | Zustand | Giỏ hàng, auth session |
| **Maps** | Leaflet + OpenStreetMap + Nominatim | Bản đồ tương tác, geocoding không cần API key trả phí |
| **Charts** | Recharts | Admin dashboard visualization |
| **Realtime** | Socket.io Client | WebSocket tracking tài xế & push notifications |

### Infrastructure

| Thành phần | Vai trò |
|:---|:---|
| **Docker Compose** | Orchestrate toàn bộ hạ tầng: DB, Redis, Elasticsearch, LocalStack, NGINX |
| **NGINX** | API Gateway, reverse proxy, path-based routing, bảo vệ route `/internal/*` |
| **LocalStack** | Mock AWS services (SNS, SQS, S3) hoàn toàn offline trên môi trường local |

---

## 🚀 Khởi Động Nhanh

### Yêu Cầu Hệ Thống

- **Docker Desktop** ≥ 4.0
- **Node.js** ≥ 20.x
- **npm** ≥ 10.x

### ⚡ Cách 1: Full Stack trên Docker (Khuyến nghị)

```bash
# 1. Clone repository
git clone https://github.com/DuyBinh2003/FoodDelivery.git
cd FoodDelivery

# 2. Cấu hình biến môi trường
cp .env.example .env

# 3. Khởi chạy toàn bộ hệ thống chỉ với 1 lệnh
docker compose up -d --build
```

**Truy cập ngay:** `http://localhost:3000`

### 🔥 Cách 2: Local Development (Hot-reload từng Service)

```bash
# Bước 1: Khởi động hạ tầng (DB, Redis, Elasticsearch, LocalStack)
docker compose up -d db redis localstack elasticsearch

# Bước 2: Chạy từng microservice trong terminal riêng
cd backend
npx nest start user-service --watch        # :3001
npx nest start admin-service --watch       # :3002
npx nest start restaurant-service --watch  # :3003
npx nest start order-service --watch       # :3004
npx nest start delivery-service --watch    # :3005
npx nest start search-service --watch      # :3006
npx nest start payment-service --watch     # :3007

# Bước 3: Chạy Frontend
cd frontend && npm run dev                 # :3001 (Next.js)
```

### 📡 Các URL Hệ Thống

| Service | URL | Mô tả |
|:---|:---|:---|
| **API Gateway** | `http://localhost:3000` | NGINX Reverse Proxy (entry point) |
| **User Service** | `http://localhost:3001` | Auth, Profile, Loyalty |
| **Admin Service** | `http://localhost:3002` | Admin API, Approvals, Metrics |
| **Restaurant Service** | `http://localhost:3003` | Menu, Store Management |
| **Order Service** | `http://localhost:3004` | Order State Machine |
| **Delivery Service** | `http://localhost:3005` | GPS Tracking, Dispatch |
| **Search Service** | `http://localhost:3006` | Elasticsearch Full-text Search |
| **Payment Service** | `http://localhost:3007` | Ledger, Wallet, Settlement |
| **PostgreSQL** | `localhost:5432` | Primary Database |
| **Redis** | `localhost:6379` | Cache, Geo, Atomic Lock |
| **Elasticsearch** | `http://localhost:9200` | Search Index |
| **LocalStack** | `http://localhost:4566` | Mock AWS: SNS + SQS + S3 |

---

## ⚙️ Biến Môi Trường

```bash
cp .env.example .env
```

**Các biến quan trọng cần cấu hình:**

```env
# ── Database ──────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5432/food_delivery

# ── Redis ─────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ───────────────────────────────────────────
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=7d

# ── LocalStack (Mock AWS) ─────────────────────────
LOCALSTACK_ENDPOINT=http://localhost:4566
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# ── Frontend ──────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> ⚠️ **Không commit file `.env`** lên repository. Chỉ chia sẻ `.env.example` — đã được cấu hình đầy đủ giá trị mặc định an toàn cho môi trường local.

---

## 📁 Cấu Trúc Dự Án

```
FoodDelivery/
├── 📱 frontend/                    # Next.js 15 (App Router + TypeScript)
│   └── src/
│       ├── app/                    # Route segments (pages & layouts)
│       ├── features/               # Feature-Based Architecture
│       │   ├── home/               # Trang chủ, tìm kiếm, categories
│       │   ├── restaurant/         # Trang menu nhà hàng
│       │   ├── cart/               # Giỏ hàng & checkout
│       │   ├── driver/             # Dashboard tài xế & GPS map
│       │   ├── partner/            # Kitchen portal nhà hàng
│       │   └── admin/              # Admin enterprise portal
│       └── shared/                 # UI components, hooks, API clients
│
├── 🔧 backend/                     # NestJS Monorepo (7 Microservices)
│   ├── apps/
│   │   ├── user-service/           # :3001 — Auth, Profile, Loyalty Engine
│   │   ├── admin-service/          # :3002 — Approvals, KYC, Metrics
│   │   ├── restaurant-service/     # :3003 — Menu CRUD, Tags, S3 Upload
│   │   ├── order-service/          # :3004 — State Machine, SQS, Redis
│   │   ├── delivery-service/       # :3005 — GPS, Dispatch, OSRM
│   │   ├── search-service/         # :3006 — Elasticsearch Integration
│   │   └── payment-service/        # :3007 — Double-Entry Ledger, Wallet
│   └── libs/                       # Shared Libraries (Monorepo)
│       ├── common/                 # Guards, Decorators, Enums, S3StorageModule
│       ├── config/                 # TypeORM, AWS SDK, Redis config
│       └── events/                 # Event Contracts — BaseEvent<T>
│
├── 🚪 gateway/
│   └── nginx.conf                  # Path-based routing, bảo vệ /internal/*
│
├── 📜 scripts/
│   ├── localstack-init.sh          # Auto-create SNS Topics + SQS Queues + S3 Bucket
│   └── sync-s3-seed.cjs            # Seed ảnh mẫu chuẩn vào LocalStack S3
│
├── 📚 docs/                        # Documentation Center (Single Source of Truth)
│   ├── architecture/               # Kiến trúc hệ thống, Event-Driven, Error Handling
│   ├── services/                   # API Contracts & specs cho 7 Microservices
│   ├── features/                   # User Flows (Customer / Partner / Driver / Admin)
│   ├── business/                   # Business Roadmap & Feature Epics
│   ├── frontend/                   # Next.js patterns, data fetching, UI/UX tokens
│   └── plans/                      # Implementation Plans — Master Query Matrix
│
├── docker-compose.yml              # Full-stack infrastructure orchestration
├── .env.example                    # Environment variables template
└── AGENTS.md                       # AI Coding Agents workflow & rules
```

---

## 🗺️ Luồng Dữ Liệu Chính

### Đặt Hàng Bất Đồng Bộ (Async Order Processing)

```
Customer ──► POST /orders ──► Order Service
                                    │
                              SQS FIFO Queue       ← Đệm chống quá tải DB
                                    │
                              Redis In-flight Cache ← Trạng thái tạm thời (TTL 24h)
                                    │
                         State Machine: PENDING → ACCEPTED → COOKING
                                                              │
                                                    READY_FOR_PICKUP
                                                              │
                                              SNS Fanout ──► Driver Dispatch
                                                              │
                                                    DELIVERING → COMPLETED
                                                              │
                                             PostgreSQL ← Deferred Write (chỉ khi COMPLETED)
                                             Payment Ledger ← Settlement + Commission
```

### Điều Phối Tài Xế (Driver Dispatch)

```
Order READY ──► SNS Publish ──► SQS: driver-dispatch-queue
                                         │
                              Delivery Service Consumer
                                         │
                           Redis GEORADIUS (bán kính 5km)
                                         │
                         WebSocket PING ──► Tất cả tài xế gần (Countdown 15s)
                                         │
                         Redis SETNX ← Atomic Lock (chống race condition)
                                         │
                         Tài xế đầu tiên ACCEPTED → Order chuyển sang DELIVERING
```

---

## 🧪 Kiểm Thử

```bash
# Toàn bộ unit test
npm test

# Type check (phải 0 errors)
npx tsc --noEmit

# Lint check (phải 0 warnings/errors)
npm run lint

# Build check
npm run build
```

> 📋 **Testing Policy:** Mọi business flow phải có **Traceability Header** liên kết với tài liệu đặc tả, phủ đủ 3 nhánh: **Happy Path / Edge Cases / Error Flow**.
> Xem danh sách test cases theo từng task tại [`docs/plans/`](./docs/plans/README.md).

---

## 📚 Tài Liệu

| Chuyên mục | Link | Nội dung |
|:---|:---|:---|
| **Kiến trúc tổng thể** | [`docs/architecture/`](./docs/architecture/README.md) | System design, Database strategy, Event-Driven, Error Handling |
| **API Contracts** | [`docs/services/`](./docs/services/README.md) | Đặc tả 7 Microservices, REST API list, port mapping |
| **User Flows** | [`docs/features/`](./docs/features/README.md) | Luồng nghiệp vụ: Customer, Partner, Driver, Admin |
| **Frontend Standards** | [`docs/frontend/`](./docs/frontend/README.md) | App Router patterns, data fetching strategy, UI/UX tokens |
| **Business Roadmap** | [`docs/business/`](./docs/business/README.md) | Epics, Issues, lộ trình phát triển sản phẩm |
| **Implementation Plans** | [`docs/plans/`](./docs/plans/README.md) | Master Query Matrix — lịch sử triển khai tất cả tasks |

**Tài liệu trọng tâm:**

- 🏗️ [System Architecture](./docs/architecture/system-architecture.md) — Bản vẽ kiến trúc đầy đủ, port mapping, event map
- 🛒 [Async Order Processing](./docs/architecture/async-order-processing-flow.md) — SQS FIFO, Redis In-flight, Deferred Persistence
- 💳 [Payment Service](./docs/services/payment-service.md) — Double-Entry Ledger, ví 4 chủ thể, COD reconciliation
- 🛵 [Driver Dispatch](./docs/plans/driver/driver-order-routing-dispatch.md) — Geospatial dispatch, Redis Atomic Lock, countdown
- 🔍 [Elasticsearch](./docs/architecture/elasticsearch.md) — Search index strategy, geo-search, sync pipeline
- 🛡️ [Error Handling](./docs/architecture/error-handling.md) — GlobalExceptionFilter, Error Boundary, Graceful Degradation

---

## 🗓️ Lịch Sử Triển Khai

| Feature | Issue/PR | Trạng thái | Mô tả |
|:---|:---:|:---:|:---|
| Address Book & Haversine Distance | [#18](https://github.com/DuyBinh2003/FoodDelivery/issues/18) | ✅ COMPLETED | Sổ địa chỉ GPS, Leaflet OSM, tính khoảng cách Haversine, snapshot tọa độ vào đơn |
| Loyalty Points & Rewards Engine | [#64](https://github.com/DuyBinh2003/FoodDelivery/pull/64) | ✅ COMPLETED | Tích điểm đa tầng 1.0x–2.0x, quy đổi giảm giá tại checkout, hoàn điểm khi hủy |
| Driver GPS Realtime Tracking | [#65](https://github.com/DuyBinh2003/FoodDelivery/pull/65) | ✅ COMPLETED | WebSocket GPS, OSRM street routing, turn-by-turn, GPS Simulator bám đường |
| Driver Order Routing & Dispatch | [#66](https://github.com/DuyBinh2003/FoodDelivery/pull/66) | ✅ COMPLETED | Redis Geospatial dispatch, countdown 15s, Atomic Lock chống race condition |
| Customer Homepage Revamp | [#68](https://github.com/DuyBinh2003/FoodDelivery/pull/68) | ✅ COMPLETED | Trang chủ cá nhân hóa, 4 feed, infinite scroll, location selector GPS |
| Restaurant Menu UI Revamp | [#69](https://github.com/DuyBinh2003/FoodDelivery/issues/69) | ✅ COMPLETED | Sticky scroll spy, modifier popup realtime, floating cart, tags & options builder |
| LocalStack S3 Asset Storage | [#70](https://github.com/DuyBinh2003/FoodDelivery/issues/70) | ✅ COMPLETED | Upload avatar/ảnh món/banner lên S3, S3StorageModule shared library |

---

## 🤝 Đóng Góp

Dự án hiện đang được phát triển cá nhân. Mọi đóng góp, thảo luận kiến trúc đều được hoan nghênh qua Issues.

```bash
# Quy trình đóng góp
git checkout -b feature/ten-tinh-nang
git commit -m "feat: mô tả thay đổi"
git push origin feature/ten-tinh-nang
# Mở Pull Request
```

---

## 📄 License

Distributed under the **MIT License**.

---

<div align="center">

**Được xây dựng với ❤️ bởi [DuyBinh2003](https://github.com/DuyBinh2003)**

*Microservices · Event-Driven · FinTech Double-Entry · Real-time GPS · Elasticsearch*

</div>
