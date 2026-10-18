# 📚 Food Delivery — Documentation Center

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật và nghiệp vụ của hệ thống **Food Delivery (Microservices & Event-Driven Architecture)**.

Tài liệu trong thư mục này được tổ chức theo cấu trúc phân cấp chuẩn hóa (**Hierarchical Documentation Architecture**), đóng vai trò là **nguồn chân lý duy nhất (Single Source of Truth)** cho toàn bộ dự án — phục vụ cả kỹ sư phát triển (Developers), quản trị sản phẩm (Product Owners/QA) và các trợ lý AI (AI Coding Agents).

---

## 🗺️ Bản Đồ Phân Cấp Thư Mục (Directory Hierarchy)

```
docs/
├── README.md                          # 📑 Master Table of Contents & Cẩm nang tra cứu (Bạn đang ở đây)
│
├── architecture/                      # 🏗️ Kiến trúc tổng thể, hạ tầng và giải pháp kỹ thuật
│   ├── README.md                      # Index chuyên mục kiến trúc
│   ├── system-architecture.md         # Bản vẽ kiến trúc tổng thể, sơ đồ kết nối, port & protocol
│   ├── microservices-design.md        # Nguyên lý phân tách service, data isolation & inter-service comms
│   ├── database-schema-strategy.md    # Chiến lược Schema-per-Service, Master/Transaction naming
│   ├── realtime-registration-flow.md  # Luồng xử lý sự kiện realtime qua AWS SNS/SQS & WebSockets
│   ├── elasticsearch.md               # Kiến trúc đồng bộ dữ liệu tìm kiếm và cấu hình Elasticsearch
│   ├── frontend-backend-connection.md # API Gateway (NGINX), routing, CORS và reverse proxy
│   ├── async-order-processing-flow.md # Xử lý đơn bất đồng bộ: SQS FIFO buffer, Redis In-flight cache, Deferred DB write
│   ├── error-handling.md              # Kiến trúc xử lý lỗi toàn diện Full-Stack (Backend filter, Frontend UI fallback)
│   └── migration-plan.md              # Lịch sử và nhật ký chuyển đổi từ Monolith sang Microservices
│
├── services/                          # ⚙️ Đặc tả chi tiết từng Microservice & Hợp đồng API (API Contracts)
│   ├── README.md                      # Bảng đối soát tổng hợp port, schema, responsibilities
│   ├── user-service.md                # Port 3001: Auth, tài khoản, hồ sơ đối tác, JWT tokens
│   ├── admin-service.md               # Port 3002: Thẩm định hồ sơ, cấu hình hệ thống, realtime metric
│   ├── restaurant-service.md          # Port 3003: Quản lý nhà hàng, thực đơn, danh mục, tags, mở/đóng quán
│   ├── order-service.md               # Port 3004: Đệm SQS FIFO, Redis In-flight, state machine, deferred DB persistence khi COMPLETED
│   ├── driver-service.md              # Port 3005: Định vị GPS tài xế, thuật toán điều phối & ghép đơn
│   ├── search-service.md              # Port 3006: Tìm kiếm thông minh nhà hàng, món ăn qua Elasticsearch
│   └── payment-service.md             # Port 3007: Kế toán kép, sổ cái append-only, ví tiền, COD & thấu chi
│
├── business/                          # 📈 Chiến lược nghiệp vụ & Lộ trình phát triển sản phẩm
│   ├── README.md                      # Index chuyên mục nghiệp vụ & epics
│   └── business-roadmap.md            # Danh sách Epic & Issue chuẩn nghiệp vụ (Customer, Partner, Driver, Admin)
│
├── features/                          # 📱 Đặc tả tính năng và luồng tương tác người dùng (User Flows)
│   ├── README.md                      # Index chuyên mục tính năng theo actor
│   ├── customer/                      # Phân hệ Khách hàng (Customer Experience)
│   │   └── advanced-cart.md           # Hệ thống giỏ hàng nâng cao, ràng buộc 1 nhà hàng, auto validation
│   ├── partner/                       # Phân hệ Đối tác Nhà hàng (Merchant Portal)
│   │   ├── merchant-partner-portal.md # Bảng điều khiển đối tác quán ăn, bật/tắt nhận đơn, quản lý menu
│   │   └── restaurant-registration-flow.md # Luồng nộp đơn, duyệt quán, realtime notifications qua WS
│   └── driver/                        # Phân hệ Đối tác Tài xế (Driver Portal)
│       ├── driver-portal.md           # Cổng thông tin tài xế, smart navbar, bật/tắt nhận chuyến
│       └── driver-registration-flow.md # Luồng đăng ký tài xế, chặn trùng lặp 1-1, duyệt hồ sơ admin
│
└── frontend/                          # 🎨 Kiến trúc, Tiêu chuẩn & Hướng dẫn Frontend (Next.js App Router)
    ├── README.md                      # Index chuyên mục frontend
    ├── frontend-data-fetching.md      # Quy chuẩn Server Components, ISR caching, Suspense boundaries
    └── frontend-ui.md                 # Design system, Component layout, Motion & UI/UX tokens
```

---

## 🎯 Hướng Dẫn Tra Cứu Theo Vai Trò (Reading Pathways)

### 1. Dành cho Backend Developer
1. Đọc [`docs/architecture/system-architecture.md`](./architecture/system-architecture.md) để hiểu kiến trúc tổng thể.
2. Đọc [`docs/architecture/database-schema-strategy.md`](./architecture/database-schema-strategy.md) trước khi tạo bảng hay viết migration mới.
3. Đọc tài liệu tương ứng trong [`docs/services/`](./services/README.md) khi triển khai hoặc mở rộng microservice.
4. Tham chiếu [`docs/architecture/realtime-registration-flow.md`](./architecture/realtime-registration-flow.md) khi làm việc với Event-Driven (SNS/SQS) hoặc WebSockets.

### 2. Dành cho Frontend Developer
1. Đọc [`docs/frontend/README.md`](./frontend/README.md) để nắm cấu trúc App Router và Feature-Based Design.
2. Đọc [`docs/frontend/frontend-data-fetching.md`](./frontend/frontend-data-fetching.md) để tuân thủ nguyên tắc Server Components & Caching.
3. Đọc [`docs/frontend/frontend-ui.md`](./frontend/frontend-ui.md) để áp dụng đúng Design Tokens và trải nghiệm người dùng cao cấp.
4. Tra cứu danh sách API tại [`docs/services/`](./services/README.md) để tích hợp đúng endpoint và data contract.

### 3. Dành cho Product Manager / QA / Business Analyst
1. Xem lộ trình tổng thể và danh sách Epics tại [`docs/business/business-roadmap.md`](./business/business-roadmap.md).
2. Kiểm tra chi tiết luồng nghiệp vụ người dùng tại [`docs/features/`](./features/README.md) (Customer, Partner, Driver).
3. Sử dụng sơ đồ trạng thái (State Machines) và ma trận nghiệp vụ để thiết kế test case và nghiệm thu tính năng.

### 4. Dành cho AI Coding Agents
- **BẮT BUỘC TUÂN THỦ**: Khi thực hiện bất kỳ task nào, Agent phải đọc `.agents/skills/documentation-policy/SKILL.md` và `.agents/skills/general-project-policy/SKILL.md`.
- Mọi API mới, table DB mới, hoặc thay đổi luồng hệ thống đều phải được cập nhật vào đúng tài liệu phân cấp trong thư mục này.

---

## 📋 Danh Mục Các Chuyên Mục Chính

| Chuyên mục | Thư mục | Mục đích & Nội dung cốt lõi |
| :--- | :--- | :--- |
| **Kiến trúc & Hạ tầng** | [`docs/architecture/`](./architecture/README.md) | Bản vẽ hệ thống, NGINX Gateway, Docker Compose, Schema Database, Event-Driven, Search Index. |
| **Microservices & APIs** | [`docs/services/`](./services/README.md) | Đặc tả 7 dịch vụ độc lập, danh sách REST API, port mapping, database schemas, internal RPC. |
| **Chiến lược & Nghiệp vụ** | [`docs/business/`](./business/README.md) | Business roadmap, các Epics tính năng, mô hình vận hành và phân loại nghiệp vụ. |
| **Tính năng & Luồng UX** | [`docs/features/`](./features/README.md) | Tài liệu tính năng phân theo đối tượng người dùng: Khách hàng (Customer), Quán ăn (Partner), Tài xế (Driver). |
| **Frontend Patterns** | [`docs/frontend/`](./frontend/README.md) | Quy chuẩn Next.js App Router, caching strategy, apiClient wrapper, UI/UX tokens. |

---

> [!TIP]
> **Nguyên tắc duy trì tài liệu (Living Documentation):**
> Tài liệu phải luôn song hành với mã nguồn. Khi refactor hoặc bổ sung tính năng mới, tài liệu tương ứng phải được cập nhật trong cùng một commit/pull request. Không để tài liệu bị lỗi thời (stale).
