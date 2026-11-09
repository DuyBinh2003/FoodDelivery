# 📋 Kế Hoạch Triển Khai: CQRS Search Catalog & Resilience Circuit Breaker Pattern

`[DRAFT]` • **Issue liên kết:** #85 • **Phân loại:** `platform` • **Ngày khởi tạo:** 2026-10-26

---

## 1. 🎯 Tổng Quan & Bài Toán Cần Giải Quyết

### 1.1. Hiện trạng & Kịch bản Thảm họa (The Catalog Bottleneck & Cascading Outage)
- **Kịch bản 1 - Tìm kiếm món ăn làm kiệt quệ Database (Search Bottleneck)**:
  - Khi ứng dụng đạt hàng triệu món ăn và hàng vạn quán ăn, khách hàng liên tục gõ tìm kiếm từ khóa ("cơm tấm sườn", "bún bò huế", "trà sữa gần đây").
  - Nếu query trực tiếp vào PostgreSQL bằng các phép toán `ILIKE '%...%'` kết hợp `JOIN` nhiều bảng (`m_restaurant`, `m_menu_item`, `m_category`, `t_review`), chi phí CPU và I/O tăng theo hàm số mũ. Chỉ cần vài trăm lượt tìm kiếm đồng thời là cơ sở dữ liệu chính sẽ bị treo cứng.
- **Kịch bản 2 - Sập dây chuyền do phụ thuộc Microservices (Cascading Outage)**:
  - Khi `search-service` hoặc `recommendation-service` bị quá tải và chậm chạp (latency vọt từ 50ms lên 5.000ms), API Gateway và các service gọi sang (`user-service`, `order-service`) sẽ giữ các kết nối HTTP chờ đợi (thread starvation).
  - Kết quả: Toàn bộ Thread Pool và Socket descriptor của các service khác bị cạn kiệt, kéo sập toàn bộ hệ thống từ ngoài vào trong dù các chức năng cốt lõi (như thanh toán, giao hàng) không hề bị lỗi.

### 1.2. Mục tiêu kỹ thuật
1. **CQRS Architecture (Tách Biệt Triệt Để Đường Ghi và Đường Đọc)**:
   - **Command Path (Đường Ghi)**: Ghi vào PostgreSQL với schema chuẩn hóa cao (3NF) để đảm bảo toàn vẹn dữ liệu ACID.
   - **Query Path (Đường Đọc)**: Đồng bộ bất đồng bộ sang **OpenSearch / Elasticsearch** và Redis Read-Model (phẳng hóa dữ liệu JSON). Toàn bộ thao tác tìm kiếm, lọc danh mục, sắp xếp theo khoảng cách và rating được phục vụ hoàn toàn bởi Read-Model với độ trễ cực thấp ($< 15\text{ms}$).
   - **Zero Data Inconsistency**: Sử dụng CDC (Change Data Capture) hoặc Event-Driven Projection: Khi quán ăn bấm "Hết món" hoặc đổi giá, Domain Event `MenuItemStockChangedEvent` lập tức cập nhật Read-Model trong vòng $< 100\text{ms}$.
2. **Resilience & Circuit Breaker Pattern (Bảo Vệ Hệ Thống Chống Sập Dây Chuyền)**:
   - Tích hợp Circuit Breaker chuẩn hóa (mô hình 3 trạng thái: `CLOSED`, `OPEN`, `HALF-OPEN`) tại Gateway và các HTTP/gRPC Client nội bộ.
   - Khi tỷ lệ lỗi hoặc latency vượt ngưỡng (ví dụ: $> 50\%$ request thất bại hoặc latency $> 2.000\text{ms}$ trong cửa sổ 10 giây): Circuit Breaker chuyển sang trạng thái `OPEN`, lập tức ngắt các cuộc gọi tiếp theo và trả về Graceful Fallback (kết quả cache tĩnh hoặc danh sách món ăn phổ biến) mà không chờ timeout.
   - Sau thời gian Reset Timeout (ví dụ: 30 giây), mạch chuyển sang `HALF-OPEN` để thử nghiệm một số lượng nhỏ request nhằm tự động phục hồi nếu service con đã khỏe lại.
3. **Mức độ Tái sử dụng Code (Reusability & Shared Kernel)**:
   - Xây dựng `@UseCircuitBreaker()` decorator và `BaseElasticsearchProjection<T>` trong `backend/libs/common` để bất kỳ service nào cũng có thể cấu hình Circuit Breaker và đồng bộ CQRS dễ dàng.

---

## 2. 🔍 Khảo Sát Hiện Trạng Codebase

| File / Component | Hiện trạng | Hành động cần thực hiện |
| :--- | :--- | :--- |
| [`backend/apps/search-service`](file:///d:/code/FoodDelivery/backend/apps/search-service) | Chưa đồng bộ hoàn chỉnh các sự kiện thay đổi tồn kho và trạng thái món thời gian thực từ `restaurant-service`. | Xây dựng Kafka/RabbitMQ consumer lắng nghe `MenuEvents` để cập nhật Elasticsearch Index. |
| [`backend/libs/common/src`](file:///d:/code/FoodDelivery/backend/libs/common) | Thiếu interceptor/decorator quản lý Circuit Breaker phân tán. | Xây dựng `CircuitBreakerModule` tích hợp thư viện `opossum` hoặc in-house state machine. |
| [`gateway/nginx.conf`](file:///d:/code/FoodDelivery/gateway) | Chưa cấu hình timeout chặt chẽ và trang lỗi fallback khi upstream service bị nghẽn. | Cấu hình proxy timeouts và custom 502/504 fallback handling. |

---

## 3. 🛠️ Thiết Kế Chi Tiết & Sơ Đồ Kiến Trúc

### 3.1. Luồng Đồng Bộ CQRS & Circuit Breaker Bảo Vệ
```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách Hàng (App)
    participant GW as API Gateway (With Circuit Breaker)
    participant SearchSvc as Search Service
    participant ES as OpenSearch Cluster (Read Model)
    participant RestSvc as Restaurant Service (Write Model)
    participant EventBus as Message Broker (RabbitMQ)

    Note over RestSvc,ES: Luồng Ghi & Đồng Bộ CQRS (Async Projection)
    RestSvc->>RestSvc: Quán cập nhật: Món "Cơm tấm" -> HẾT HÀNG
    RestSvc->>EventBus: Publish Domain Event: ItemStockUpdated(id, status: OUT_OF_STOCK)
    EventBus->>SearchSvc: Consume ItemStockUpdated
    SearchSvc->>ES: Update Doc id: {"is_available": false} trong < 50ms

    Note over Customer,ES: Luồng Đọc & Circuit Breaker (Query Path)
    Customer->>GW: GET /search?q=com+tam&lat=...&lng=...
    alt Circuit Breaker trạng thái CLOSED (Hoạt động bình thường)
        GW->>SearchSvc: Proxy Request
        SearchSvc->>ES: Elasticsearch Geo-Distance & Fuzzy Search
        ES-->>SearchSvc: Trả về kết quả trong 10ms (Món Cơm tấm hiển thị "Hết hàng")
        SearchSvc-->>GW: 200 OK
        GW-->>Customer: Hiển thị kết quả chính xác
    else Search Service bị treo/quá tải (Latency > 2.000ms)
        Note over GW: Circuit Breaker phát hiện ngưỡng lỗi vượt quá 50% -> CHUYỂN SANG TRẠNG THÁI OPEN!
        GW-->>Customer: Trả về Fallback Data tức thì (Top Trending Dishes Cached) trong 5ms!
        Note over GW: Không gửi thêm request xuống Search Service, cứu hệ thống khỏi sập nguồn!
    end
```

### 3.3. Thiết Kế Trải Nghiệm Người Dùng Phía Frontend (Next.js Search & Circuit Breaker Degradation UX)

1. **Giao Diện Suy Thoái Nhẹ Nhàng (Graceful Degradation Banner)**:
   - Khi Search Service gặp sự cố và Circuit Breaker chuyển sang trạng thái `OPEN` (trả về fallback header `X-Circuit-Status: OPEN`):
     - Trang tìm kiếm (`/search` hoặc `SearchBar`) không bao giờ được crash trắng trang hay hiển thị thông báo lỗi 500 thô.
     - Hiển thị Banner màu xanh lam nhẹ nhàng trên đầu danh sách: `"Hệ thống tìm kiếm tức thời đang được tối ưu. Đang gợi ý các món ăn & quán ngon phổ biến gần bạn."`
2. **Khung Tìm Kiếm Dự Phòng & Gợi Ý Thay Thế (Fallback Catalog Grid)**:
   - Tự động hiển thị danh mục món ăn thịnh hành (`Trending Categories`) được cache sẵn tại LocalStorage/Service Worker.
   - Thẻ món ăn và quán ăn hiển thị đầy đủ thông tin: ảnh món, giá tiền, cự ly và đánh giá sao từ dữ liệu snapshot an toàn.
   - Nút `[Thử tìm lại]`: Áp dụng kỹ thuật Debounce và Exponential Backoff (3s, 6s, 12s) để tránh người dùng bấm liên tục làm quá tải thêm gateway.
3. **Đồng Bộ Huy Hiệu Món Ăn Thời Gian Thực (CQRS Projection Badges)**:
   - Nhờ bản chiếu CQRS đồng bộ dưới 100ms, thẻ món ăn trong kết quả tìm kiếm hiển thị ngay lập tức nhãn `Tạm hết hàng` hoặc `Giảm giá 20%` mà người dùng không cần phải click vào trang chi tiết của quán mới phát hiện ra.

---

## 4. 🧪 Kịch Bản Kiểm Thử 3 Nhánh (Testing Policy Compliance)

### 4.1. Nhánh 1: Happy Path (Dòng Chảy Chuẩn)
- **Kịch bản**: Quán ăn cập nhật giá món từ 40k lên 45k tại `restaurant-service`. Khách hàng thực hiện tìm kiếm món ăn tại `search-service`.
- **Kỳ vọng**: 
  - Ghi nhận thành công vào PostgreSQL.
  - Sự kiện bắn qua Message Broker cập nhật Elasticsearch Index trong vòng $< 100\text{ms}$.
  - Kết quả tìm kiếm trả về giá mới 45k chính xác.

### 4.2. Nhánh 2: Edge Cases (Biên & Giới Hạn)
- **Kịch bản 1 (Mạng chập chờn khi cập nhật OpenSearch)**: Node OpenSearch bị nghẽn I/O khiến việc sync index thất bại.
- **Kỳ vọng**: Sự kiện được đẩy vào Dead Letter Queue (DLQ), kích hoạt cơ chế retry 3 lần với exponential backoff mà không làm mất dữ liệu cập nhật.
- **Kịch bản 2 (Chuyển trạng thái Circuit Breaker Half-Open)**: Sau 30 giây ở trạng thái OPEN, hệ thống cho phép 5 request thăm dò (canary requests) đi qua. Nếu cả 5 đều thành công với latency $< 100\text{ms}$, mạch tự động đóng (`CLOSED`) trở lại bình thường.

### 4.3. Nhánh 3: Error & Rejection Flow (Ngoại Lệ & Khắc Phục)
- **Kịch bản**: `search-service` bị ngắt kết nối hoàn toàn (Connection Refused).
- **Kỳ vọng**: Circuit Breaker ngay lập tức trip sang `OPEN`, ném fallback response chuẩn cấu trúc JSON mà không làm treo các request của các service khác trong hệ thống.

---

## 5. ✅ Checklist Tiêu Chuẩn Cần Vượt Qua (Local CI Gate)

- [ ] **Linter**: `npm run lint` đạt 0 warnings, 0 errors.
- [ ] **Type Check**: `npx tsc --noEmit` đạt 0 errors.
- [ ] **Unit Tests (Vitest)**:
  - [ ] `libs/common/tests/circuit-breaker.spec.ts` pass 100%.
  - [ ] `search-service/tests/elasticsearch-sync-projection.spec.ts` pass 100%.
  - [ ] `search-service/tests/circuit-breaker-fallback.spec.ts` pass 100%.
  - [ ] `frontend/src/features/search/tests/circuit-breaker-degradation-banner.spec.ts` pass 100%.
- [ ] **Build Check**: `npm run build` thành công.
- [ ] **Traceability Header**: Đầy đủ `[Requirement/Issue]`, `[Branch: Happy|Edge|Error]`, `[Expected Output]`.
