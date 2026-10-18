# 🏗️ Kiến Trúc Xử Lý Đơn Hàng Bất Đồng Bộ (Queue-Based Load Leveling & Sequential Partner-Driver Flow)

Tài liệu mô tả chi tiết thiết kế kỹ thuật, luồng thông điệp bất đồng bộ tuần tự giữa **Khách hàng ➔ Nhà hàng (Kitchen) ➔ Tài xế (Driver)** qua AWS SQS, AWS SNS, Redis Atomic Claim và Deferred Persistence trong hệ sinh thái **Food Delivery**.

---

## 1. Bối Cảnh & Kiến Trúc Tổng Thể (Context & System Flow)

### 1.1. Mục Tiêu Kiến Trúc
1. **Queue-Based Load Leveling (San phẳng tải trọng tiếp nhận)**:
   - SQS Queue `food-delivery-orders` đóng vai trò bộ đệm tiếp nhận đơn hàng (Ingestion Buffer). Khách đặt đơn nhận phản hồi tức thì `201 Created` kèm `orderId` (UUID) và trạng thái `PENDING` mà không phải chờ ghi DB đồng bộ.
2. **In-flight State Caching Trên Redis**:
   - Toàn bộ dữ liệu đơn hàng trong quá trình luân chuyển (`PENDING` ➔ `COOKING` ➔ `READY_FOR_PICKUP` ➔ `DELIVERING`) được quản lý bằng bộ nhớ đệm tốc độ cao Redis (`order:inflight:{id}`) với TTL 24h.
3. **Quy Trình Xử Lý Tuần Tự (Sequential Order Processing)**:
   - **Nhà hàng nhận đơn đầu tiên**: Bếp xem danh sách đơn chờ tại tab *Bếp & Quản lý đơn hàng* trên Partner Dashboard, chủ động bấm **"Nhận đơn & Nấu"** (`COOKING`).
   - **Khi nấu xong**: Bếp bấm **"Món đã xong - Tìm tài xế"** (`READY_FOR_PICKUP`), hệ thống tự động bắn bản tin vào SNS Topic `order-driver-dispatch`.
4. **Phát Tán Điều Phối & Nhận Cuốc Bất Khả Tranh Chấp (SNS Fanout & Atomic Claim)**:
   - SNS Topic `order-driver-dispatch` tự động Fanout tới SQS Queue `driver-dispatch-queue` của các tài xế.
   - **Xác thực trạng thái hoạt động (Active Check)**: Chỉ các tài xế đang **Trực tuyến (`status == 'ONLINE'`)** và **Đã phê duyệt (`verification_status == 'APPROVED'`)** mới được phép lấy danh sách chuyến xe broadcast trong tab *Đơn chờ nhận* (`GET /orders/driver/available`). Tài xế ngoại tuyến không bị làm phiền và hệ thống không bắn đơn tới họ.
   - Cơ chế **Redis Lua Atomic Script (`claimOrder`)** bảo đảm khi nhiều tài xế cùng bấm *Nhận chuyến*, hệ thống kiểm tra trạng thái active và chỉ một tài xế nhanh nhất nhận được chuyến xe (`DELIVERING` gán `driver_id`), các tài xế khác nhận phản hồi `409 Conflict`.
5. **Trì Hoãn Ghi Cơ Sở Dữ Liệu (Deferred Persistence)**:
   - Khi tài xế giao hàng thành công và nhấn **`COMPLETED`**: Order Service dump toàn bộ snapshot từ Redis xuống PostgreSQL `schema_order` (`t_order` + `t_order_item`) trong một Database Transaction duy nhất, sau đó rút ngắn TTL Redis còn 30 phút để giải phóng RAM.

---

## 2. Sơ Đồ Thiết Kế Hệ Thống (Architecture & Sequence Diagram)

### 2.1. Sơ Đồ Thành Phần Hệ Thống

```mermaid
graph TD
    Client["📱 Khách Hàng (Next.js Frontend)"] -->|POST /orders| GW["🚪 API Gateway (:3000)"]
    GW --> OS["🛒 Order Service (:3004)"]

    subgraph "Tầng Đệm & Lưu Trữ Tạm Thời (In-flight Layer)"
        OS -->|1. Lưu Snapshot PENDING| Redis[("⚡ Redis Cache\norder:inflight:{id}")]
        OS -->|2. Đẩy Message ORDER_CREATED| SQS_Ingestion[("📥 SQS Queue\nfood-delivery-orders")]
    end

    subgraph "Tầng Bếp Nhà Hàng (Partner Portal)"
        SQS_Ingestion -->|3. Nhận đơn vào danh sách chờ| Rest["🍳 Merchant Kitchen (PartnerDashboard)"]
        Rest -->|4. Nhận nấu: COOKING| OS
        Rest -->|5. Xong món: READY_FOR_PICKUP| SNS_Driver["📢 SNS Topic\norder-driver-dispatch"]
    end

    subgraph "Tầng Điều Phối Tài Xế (Delivery & Atomic Claim)"
        SNS_Driver -->|6. Fanout Broadcast| DriverQueue[("📥 SQS Queue\ndriver-dispatch-queue")]
        DriverQueue --> DriverApp["🛵 Driver Dashboard (/driver/dashboard)"]
        DriverApp -->|7. Nhận chuyến: Atomic Claim| Redis
        Redis -->|8. Gán driver_id & DELIVERING| DriverApp
    end

    subgraph "Tầng Lưu Trữ Vĩnh Viễn (Deferred Persistence)"
        DriverApp -->|9. Xác nhận COMPLETED| OS
        OS -->|10. Dump Snapshot xuống DB| DB[("🐘 PostgreSQL (:5432)\nschema_order.t_order & t_order_item")]
    end
```

### 2.2. Sơ Đồ Luồng Tuần Tự Chi Tiết (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor C as 📱 Khách hàng
    participant API as 🛒 Order Service
    participant R as ⚡ Redis In-flight
    participant SQS_Rest as 📥 SQS (food-delivery-orders)
    actor Rest as 🍳 Bếp Nhà Hàng
    participant SNS as 📢 SNS (order-driver-dispatch)
    participant SQS_Driver as 📥 SQS (driver-dispatch-queue)
    actor D1 as 🛵 Tài xế A
    actor D2 as 🛵 Tài xế B
    participant DB as 🐘 PostgreSQL (schema_order)

    %% Phase 1: Ingestion
    C->>API: POST /orders (Items, Restaurant, Delivery Address)
    API->>R: SET order:inflight:{id} (status: PENDING, TTL: 24h)
    API->>SQS_Rest: Publish ORDER_CREATED
    API-->>C: HTTP 201 Created (id, status: PENDING)

    %% Phase 2: Kitchen Cooking
    SQS_Rest->>Rest: Hiển thị đơn mới tại Tab Bếp & Quản lý đơn hàng
    Rest->>API: PATCH /orders/:id/status { status: 'COOKING' }
    API->>R: UPDATE status = COOKING
    Note over Rest: Bếp tiến hành nấu và chuẩn bị món ăn...
    Rest->>API: PATCH /orders/:id/status { status: 'READY_FOR_PICKUP' }
    API->>R: UPDATE status = READY_FOR_PICKUP
    API->>SNS: Publish Event ORDER_READY_FOR_PICKUP

    %% Phase 3: Driver Fanout & Atomic Claim
    SNS->>SQS_Driver: Fanout Broadcast chuyến xe mới
    SQS_Driver->>D1: D1 đang ONLINE: Hiển thị cuốc xe tại Tab "Đơn chờ nhận"
    Note over D2: D2 đang OFFLINE: Không hiển thị đơn, không phát tán
    par Hai tài xế cùng thao tác Nhận chuyến
        D1->>API: POST /orders/:id/driver-claim (D1 ONLINE)
        API->>R: Lua Script Atomic Claim (D1 đến trước & Active)
        R-->>API: Claim Thành Công
        API-->>D1: HTTP 200 OK (Chuyển sang DELIVERING, bắt đầu đi giao)
    and
        D2->>API: POST /orders/:id/driver-claim (D2 OFFLINE)
        API-->>D2: HTTP 403 Forbidden (Tài xế đang Ngoại tuyến, không thể nhận chuyến)
    end

    %% Phase 4: Delivery & Deferred Persistence
    D1->>API: PATCH /orders/driver/trips/:id/status { status: 'COMPLETED' }
    API->>R: Lấy toàn bộ snapshot hoàn chỉnh
    API->>DB: BEGIN Transaction: INSERT t_order & t_order_item
    DB-->>API: Transaction Committed thành công
    API->>R: Đặt TTL ngắn 30 phút dọn dẹp RAM
    API-->>D1: HTTP 200 OK (Hoàn tất cuốc xe thành công)
```

---

## 3. Vòng Đời Trạng Thái Đơn Hàng (Order State Lifecycle)

| Trạng thái | Đối tượng kích hoạt | Kênh truyền / Hành động | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | Khách hàng | `POST /orders` ➔ SQS `food-delivery-orders` | Đơn đã tạo trên bộ đệm Redis, chờ nhà hàng tiếp nhận. |
| **`COOKING`** | Bếp Nhà hàng | `PATCH /orders/:id/status` từ Partner Dashboard | Nhà hàng nhận đơn và đang chuẩn bị chế biến món ăn. |
| **`READY_FOR_PICKUP`** | Bếp Nhà hàng | `PATCH /orders/:id/status` ➔ SNS Fanout | Món đã nấu xong, phát tán tìm tài xế giao hàng. |
| **`DELIVERING`** | Tài xế | `POST /orders/:id/driver-claim` (Atomic Lua) | Tài xế đã nhận cuốc xe thành công và đang trên đường giao. |
| **`COMPLETED`** | Tài xế | `PATCH /orders/driver/trips/:id/status` | Giao tận tay khách hàng. Kích hoạt Deferred Persistence ghi DB. |
| **`CANCELLED`** | Khách / Admin | `PATCH /orders/:id/status` | Hủy đơn hàng. Nếu đã trừ ví thì ghi DB đối soát hoàn tiền. |

---

## 4. Đặc Tả Cơ Chế Chống Tranh Chấp (Redis Atomic Claim)

Nhằm loại bỏ hoàn toàn hiện tượng nhiều tài xế cùng nhận một chuyến xe (Race-Condition), hệ thống triển khai mã lệnh Lua Script thực thi nguyên tử (Atomic) trong Redis Engine:

```lua
local key = KEYS[1]
local driverId = ARGV[1]
local now = ARGV[2]
local data = redis.call('GET', key)
if not data then
  return 'NOT_FOUND'
end
local order = cjson.decode(data)
-- Chỉ cho phép nhận nếu status là READY_FOR_PICKUP/ACCEPTED và chưa có driver_id
if (order.status == 'READY_FOR_PICKUP' or order.status == 'ACCEPTED') and (not order.driver_id or order.driver_id == '') then
  order.driver_id = driverId
  order.driver_claimed_at = now
  order.status = 'DELIVERING'
  order.updated_at = now
  local updatedData = cjson.encode(order)
  local ttl = redis.call('TTL', key)
  if ttl > 0 then
    redis.call('SET', key, updatedData, 'EX', ttl)
  else
    redis.call('SET', key, updatedData)
  end
  return updatedData
else
  return 'CONFLICT'
end
```

---

## 5. Danh Sách Endpoint Mới

| Endpoint | Method | Role | Mục đích |
| :--- | :---: | :---: | :--- |
| `/orders/restaurant/:restaurantId` | `GET` | Partner | Lấy toàn bộ đơn của nhà hàng (kết hợp in-flight Redis và lịch sử DB, kèm mốc nấu nướng) |
| `/orders/driver/available` | `GET` | Driver | Lấy danh sách các chuyến xe broadcast đang chờ tài xế nhận |
| `/orders/:id/driver-claim` | `POST` | Driver | Tài xế nhận cuốc xe với cơ chế Redis Atomic Lock (chống race condition, đóng dấu `driver_claimed_at`) |
| `/orders/:id/status` | `PATCH` | Partner/Admin | Cập nhật trạng thái chế biến (`COOKING`, `READY_FOR_PICKUP`) đóng dấu `cooking_at` / `ready_at` |
| `/orders/driver/trips/:id/status` | `PATCH` | Driver | Cập nhật hoàn thành giao hàng (`COMPLETED`) đóng dấu `completed_at` và kích hoạt ghi DB |
| `/orders/driver/trips` | `GET` | Driver | Danh sách chuyến xe của tài xế kèm mốc `claimed_at`, `completed_at`, và thời lượng cuốc `duration_minutes` |

---

## 6. Cơ Chế Mốc Thời Gian Theo Từng Đối Tượng (Role-Based Milestones Lifecycle)

Nhằm tối ưu hóa trải nghiệm người dùng theo góc nhìn nghiệp vụ thực tế, hệ thống phân định mốc thời gian rõ ràng cho từng Actor:

| Actor | Mốc thời gian trọng tâm | Giao diện hiển thị | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **🛵 Tài xế (Driver)** | • `claimed_at` (Nhận cuốc)<br>• `completed_at` (Giao xong)<br>• `duration_minutes` (Thời lượng cuốc xe) | `[Nhận: HH:mm] ➔ [Giao: HH:mm] (⚡ X phút)` tại Driver Trip Card | Tài xế chỉ quan tâm thời gian thực hiện cuốc xe của mình, không quan tâm đơn hàng được khách tạo lúc nào. |
| **📱 Khách hàng (Customer)** | • `created_at` (Đặt đơn)<br>• `cooking_at` (Bắt đầu nấu)<br>• `ready_at` (Bếp xong)<br>• `driver_claimed_at` (Tài xế nhận)<br>• `completed_at` (Nhận món) | 5-Step Progressive Live Stepper kèm giờ cụ thể dưới từng chặng đã qua | Khách hàng theo dõi toàn bộ hành trình món ăn từ lúc thanh toán tới khi nhận tận tay. |
| **🍳 Bếp Nhà Hàng (Partner)** | • `created_at` (Giờ khách đặt)<br>• `cooking_at` (Giờ nhận nấu)<br>• `ready_at` (Giờ nấu xong)<br>• `driver_claimed_at` (Giờ tài xế lấy món) | Badge mốc thời gian tại Header thẻ đơn hàng Kitchen Orders Tab | Bếp kiểm soát tốc độ ra món (SLA nấu) và thời điểm tài xế ghé lấy món ăn. |

