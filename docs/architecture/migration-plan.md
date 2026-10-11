# 🗺️ Microservices Migration Plan

Tài liệu này theo dõi lộ trình chuyển đổi từ **Modular Monolith** (hiện tại) sang **True Microservices** (mục tiêu). Cập nhật trạng thái mỗi phase khi hoàn thành.

---

## Bối Cảnh

| | Hiện Tại | Mục Tiêu |
| :--- | :--- | :--- |
| **Cấu trúc code** | `backend/src/modules/` chứa tất cả | `services/user-service/`, `services/admin-service/`, ... |
| **Runtime** | 1 NestJS process, 1 port | Mỗi service = 1 process, 1 port riêng |
| **Database access** | Modules import Entity nhau trực tiếp | Mỗi service chỉ sở hữu schema của mình |
| **Inter-service comms** | Direct TypeORM query | HTTP (sync) hoặc SNS/SQS (async) |

---

## Phase 0 — Fix LocalStack Init
**Status:** 🔴 TODO  
**Ưu tiên:** Khẩn cấp — giải quyết bug SNS/SQS không nhận message

**Vấn đề gốc rễ:**
- `docker-compose.yml` thiếu `SERVICES=sqs,sns` trong environment của LocalStack
- File `.env` có `SERVICES=sqs` nhưng thiếu `sns`

**Checklist:**
- [ ] Thêm `environment: - SERVICES=sqs,sns` vào `docker-compose.yml`
- [ ] Cập nhật `.env`: `SERVICES=sqs,sns`
- [ ] Verify `localstack-init.sh` tạo đủ Topic + Queue + Subscription
- [ ] Test: Gửi registration → Kiểm tra SNS/SQS Dashboard trên LocalStack

---

## Phase 1 — Bỏ Cross-module Entity Import
**Status:** 🔴 TODO  
**Ưu tiên:** Cao — vi phạm nguyên tắc cốt lõi của Microservices

**Vấn đề:**
`AdminModule` hiện đang import Entity từ các module khác:
```typescript
// admin.module.ts ← SAI
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { User } from '@/modules/users/entities/user.entity.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
```

**Giải pháp:** Admin Service đọc data thông qua HTTP call tới các service khác (internal URL), không query DB trực tiếp.

**Checklist:**
- [ ] Xoá các imports Entity thừa khỏi `admin.module.ts`
- [ ] `AdminService.getPendingApprovals()` → gọi HTTP tới User Service endpoint
- [ ] `AdminService.getDashboardMetrics()` → aggregate từ nhiều service HTTP calls

---

## Phase 2 — Tái Cấu Trúc Thư Mục Monorepo
**Status:** 🟡 PLANNED  
**Ưu tiên:** Trung bình

**Cấu trúc đích:**
```
FoodDelivery/
├── frontend/                       # Next.js App (giữ nguyên)
├── services/
│   ├── user-service/               # NestJS, port 3001
│   │   ├── src/
│   │   │   ├── modules/users/
│   │   │   ├── modules/auth/
│   │   │   └── main.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── admin-service/              # NestJS, port 3002
│   ├── restaurant-service/         # NestJS, port 3003
│   ├── order-service/              # NestJS, port 3004
│   └── driver-service/             # NestJS, port 3005
├── libs/
│   └── events/                     # Shared event contracts (TypeScript interfaces)
│       ├── registration.events.ts
│       ├── order.events.ts
│       └── index.ts
├── docker-compose.yml              # Infrastructure + all services
├── scripts/
│   └── localstack-init.sh
└── README.md
```

**Checklist:**
- [ ] Tạo thư mục `services/`
- [ ] Di chuyển `backend/src/modules/users` + `auth` → `services/user-service/src/modules/`
- [ ] Di chuyển `backend/src/modules/admin` → `services/admin-service/src/modules/`
- [ ] Di chuyển `backend/src/modules/restaurants` → `services/restaurant-service/src/modules/`
- [ ] Di chuyển `backend/src/modules/orders` → `services/order-service/src/modules/`
- [ ] Di chuyển `backend/src/modules/drivers` → `services/driver-service/src/modules/`
- [ ] Tạo `package.json` riêng cho mỗi service
- [ ] Cập nhật `docker-compose.yml` thêm các service containers
- [ ] Cập nhật migration scripts để chạy per-service

---

## Phase 3 — Chuẩn Hoá Event Contract
**Status:** 🟡 PLANNED  
**Ưu tiên:** Trung bình

**Mục tiêu:** Tất cả events publish lên SNS phải có TypeScript interface được định nghĩa trong `libs/events/`. Tránh magic strings, đảm bảo type-safety.

**Event Contract Schema:**
```typescript
// libs/events/registration.events.ts
export interface RegistrationCreatedEvent {
  eventType: 'RegistrationCreated';
  version: '1.0';
  timestamp: string;
  data: {
    id: string;
    userId: string;
    type: 'RESTAURANT' | 'DRIVER';
    payload: Record<string, unknown>;
    status: 'PENDING';
    createdAt: string;
  };
}

// libs/events/order.events.ts
export interface OrderCreatedEvent {
  eventType: 'OrderCreated';
  version: '1.0';
  timestamp: string;
  data: {
    orderId: string;
    customerId: string;
    restaurantId: string;
    items: Array<{ menuItemId: string; quantity: number; price: number }>;
    totalAmount: number;
  };
}
```

**Checklist:**
- [ ] Tạo thư mục `libs/events/`
- [ ] Định nghĩa `RegistrationCreatedEvent`
- [ ] Định nghĩa `OrderCreatedEvent`
- [ ] Định nghĩa `DriverAssignedEvent`
- [ ] Cập nhật `SubmitRegistrationUseCase` dùng typed event
- [ ] Cập nhật `RegistrationSqsConsumer` validate typed event

---

## Phase 4 — API Gateway (NGINX)
**Status:** 🔵 BACKLOG  
**Ưu tiên:** Thấp (quan trọng khi production)

**Mục tiêu:** Thêm NGINX làm API Gateway duy nhất, Frontend chỉ cần biết 1 URL.

**Routing config:**
```nginx
location /api/v1/users    { proxy_pass http://user-service:3001; }
location /api/v1/auth     { proxy_pass http://user-service:3001; }
location /api/v1/admin    { proxy_pass http://admin-service:3002; }
location /api/v1/restaurants { proxy_pass http://restaurant-service:3003; }
location /api/v1/orders   { proxy_pass http://order-service:3004; }
location /api/v1/drivers  { proxy_pass http://driver-service:3005; }
location /api/v1/search   { proxy_pass http://search-service:3006; }
```

**Checklist:**
- [ ] Tạo `nginx/nginx.conf`
- [ ] Thêm service `nginx` vào `docker-compose.yml`
- [ ] Cập nhật `NEXT_PUBLIC_API_URL` → trỏ vào NGINX port
- [ ] Handle WebSocket upgrade headers cho Socket.io

---

## Ghi Chú Kỹ Thuật

### Tại Sao Giữ SNS/SQS thay vì @nestjs/event-emitter?
`@nestjs/event-emitter` chỉ hoạt động trong nội bộ 1 process Node.js. Khi tách services ra các process riêng biệt (Phase 2), sự kiện sẽ không thể truyền qua lại. SNS/SQS là Message Broker bên ngoài, đảm bảo message vẫn hoạt động sau khi tách services.

### Cross-service Data (Logical Reference Pattern)
Thay vì JOIN qua schema, mỗi service chỉ lưu UUID của entity bên kia:
```typescript
// order-service: t_order
{ restaurant_id: UUID }  // Không FK, chỉ lưu UUID
// Để lấy tên nhà hàng → HTTP GET /restaurants/:id
```
