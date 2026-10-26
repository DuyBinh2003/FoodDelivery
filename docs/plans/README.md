# 📋 Thư Mục Kế Hoạch Triển Khai (Master Implementation Plans)

Thư mục này là **Trung tâm Quản lý & Tra cứu Kế hoạch Triển khai (Implementation Plans)** cho toàn bộ các tính năng, nâng cấp và cải tiến kiến trúc của dự án FoodDelivery.

---

## 1. Bản Đồ Phân Loại Thư Mục (Taxonomy & Hierarchy)

Để dễ dàng tra cứu, lọc và phân nhóm khi số lượng task tăng lên, toàn bộ kế hoạch triển khai được phân bổ theo 5 nhóm miền nghiệp vụ (Domains / Actors):

```text
docs/plans/
├── README.md               # 📌 Master Index & Bảng Tra Cứu Kế Hoạch (File này)
├── customer/               # 🧑 Khách hàng: Giỏ hàng, Địa chỉ, Tìm kiếm, Đặt món...
├── driver/                 # 🛵 Tài xế: Nhận cuốc, Lộ trình, Định vị GPS, Ví tài xế...
├── partner/                # 🏪 Nhà hàng: Màn hình bếp (KDS), Quản lý menu, Giờ mở cửa...
├── admin/                  # 👑 Quản trị viên: KYC xét duyệt, CS Portal, Báo cáo...
└── platform/               # ⚙️ Nền tảng lõi: Sổ cái thanh toán, Loyalty Engine, Event Bus, Auth...
```

---

## 2. Bảng Tra Cứu Kế Hoạch Toàn Hệ Thống (Master Query Matrix)

Bảng này được tự động cập nhật bởi các Sub-Agent (`@planner` & `@orchestrator`) mỗi khi có một kế hoạch mới được đề xuất hoặc hoàn thành:

| Mã Task / Kế Hoạch | Miền / Actor | Issue | Trạng Thái | Mô Tả Tóm Tắt | Link Kế Hoạch |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `loyalty-points-rewards-engine` | `platform` | [#19](https://github.com/DuyBinh2003/FoodDelivery/pull/64) | `[COMPLETED]` | Hệ thống tích điểm theo hạng thành viên (1.0x - 2.0x), quy đổi giảm giá giỏ hàng (1 điểm = 10 VND, trần 50%), hoàn điểm tự động khi hủy đơn. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/loyalty-points-rewards-engine.md) |
| `customer-loyalty-ui` | `customer` | [#19](https://github.com/DuyBinh2003/FoodDelivery/pull/64) | `[COMPLETED]` | Giao diện tiêu điểm thưởng tại Checkout (/checkout), trang Khách hàng thân thiết & Hạng thành viên (/rewards), và mục điều hướng Header. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/customer-loyalty-ui.md) |
| `driver-tracking-realtime-gps` | `driver` | [#28](https://github.com/DuyBinh2003/FoodDelivery/pull/65) | `[COMPLETED]` | Bản đồ tương tác Leaflet đo cự ly giao hàng (km), định vị GPS thời gian thực của tài xế qua WebSocket (/delivery) và tích hợp vào UI Order Tracker. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/driver/driver-tracking-realtime-gps.md) |
| `street-routing-turn-by-turn-map` | `driver` | [#28](https://github.com/DuyBinh2003/FoodDelivery/pull/65) | `[COMPLETED]` | Định tuyến đường phố thực tế OSRM, hiển thị Polyline bám cua ngã rẽ, thanh chỉ dẫn Turn-by-Turn và nâng cấp GPS Simulator theo đường phố. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/driver/street-routing-turn-by-turn-map.md) |
| `driver-order-routing-dispatch` | `driver` | [#29](https://github.com/DuyBinh2003/FoodDelivery/pull/66) | `[COMPLETED]` | Thuật toán chia cuốc tự động qua Redis Geospatial, tìm tài xế gần nhất trong bán kính 5km, ping WebSocket với countdown 15s chấp nhận cuốc. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/driver/driver-order-routing-dispatch.md) |
| `customer-homepage-revamp` | `customer` | [#67](https://github.com/DuyBinh2003/FoodDelivery/pull/68) | `[COMPLETED]` | Nâng cấp toàn diện giao diện trang chủ: Bộ chọn địa chỉ GPS, thanh tìm kiếm động, banner carousel, grid danh mục, 4 feed cá nhân hóa, infinite scroll, và bottom navigation. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/customer-homepage-revamp.md) |
| `restaurant-menu-ui-revamp` | `customer` | [#69](https://github.com/DuyBinh2003/FoodDelivery/issues/69) | `[COMPLETED]` | Nâng cấp toàn diện trang menu: Header tính cự ly/ETA/phí ship động và vouchers, Sticky Category với Scroll Spy 2 chiều, thẻ món có giá gốc, cửa sổ modifier bắt buộc/tùy chọn với giá realtime, giỏ hàng nổi đáy màn hình và lưu trữ localStorage. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/restaurant-menu-ui-revamp.md) |
| `menu-item-tags-and-options-management` | `partner` | [#69](https://github.com/DuyBinh2003/FoodDelivery/issues/69) | `[COMPLETED]` | Gộp migration, làm giàu seed data (tags & options), hiển thị tags từ DB trên popup AddToCartDialog và cấp quyền tạo/sửa chi tiết món ăn (Tags, Options Builder, Giá gốc) cho nhà hàng từ trang quản lý. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/partner/menu-item-tags-and-options-management.md) |
| `localstack-s3-asset-storage` | `platform` | [#70](https://github.com/DuyBinh2003/FoodDelivery/issues/70) | `[COMPLETED]` | Sử dụng LocalStack AWS S3 lưu trữ tài nguyên đa phương tiện (Avatar người dùng, món ăn, banner nhà hàng), cung cấp shared S3StorageModule, endpoints upload và tích hợp UI. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/localstack-s3-asset-storage.md) |
| `promotion-voucher-engine` | `platform` | [#75](https://github.com/DuyBinh2003/FoodDelivery/issues/75) | `[COMPLETED]` | Hệ thống voucher & khuyến mại đa tầng (Platform vs Merchant), quy tắc kiểm tra giá trị tối thiểu, khung giờ vàng, trần phần trăm, giới hạn lượt dùng và tích hợp Sổ cái kép. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/promotion-voucher-engine.md) |
| `realtime-order-chat` | `customer` | [#76](https://github.com/DuyBinh2003/FoodDelivery/issues/76) | `[COMPLETED]` | Kênh chat thời gian thực Khách hàng - Tài xế - Nhà hàng qua WebSocket Socket.IO (/delivery), hỗ trợ Quick replies, chỉ báo đã xem và lưu trữ lịch sử tin nhắn. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/realtime-order-chat.md) |
| `payment-gateway-webhook` | `platform` | [#77](https://github.com/DuyBinh2003/FoodDelivery/issues/77) | `[COMPLETED]` | Tích hợp Cổng thanh toán trực tuyến (VNPay / MoMo SDK/REST), sinh link thanh toán/QR Pay, Webhook IPN Listener xác thực chữ ký số HMAC, Idempotency Sổ cái kép và giao diện người dùng (Checkout QR Modal, Topup Modal, Return Page). | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/payment-gateway-webhook.md) |
| `review-and-rating-system` | `customer` | [#74](https://github.com/DuyBinh2003/FoodDelivery/issues/74) | `[COMPLETED]` | Hệ thống đánh giá & xếp hạng 3 bên (món ăn, nhà hàng, tài xế) sau khi hoàn tất đơn hàng, tự động tính điểm trung bình và đồng bộ tức thời với Elasticsearch index. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/review-and-rating-system.md) |
| `order-review-image-upload-and-toast-fix` | `customer` | [#74](https://github.com/DuyBinh2003/FoodDelivery/issues/74) | `[COMPLETED]` | Nâng cấp UI popup review hỗ trợ upload ảnh trực tiếp lên LocalStack S3 (thay vì nhập URL) và khắc phục lỗi không render Toast notification khi hoàn tất review. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/order-review-image-upload-and-toast-fix.md) |
| `auth-refresh-token-rotation` | `platform` | [#73](https://github.com/DuyBinh2003/FoodDelivery/issues/73) | `[COMPLETED]` | Quản lý phiên đăng nhập với Refresh Token Rotation (RTR), phát hiện Replay Attack và cơ chế thu hồi tức thì qua Redis Blacklist. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/auth-refresh-token-rotation.md) |
| `gateway-delivery-ws-routing` | `platform` | [#72](https://github.com/DuyBinh2003/FoodDelivery/issues/72) | `[COMPLETED]` | Cấu hình API Gateway NGINX định tuyến toàn diện Delivery Service, hỗ trợ kết nối WebSocket hai chiều cho Socket.io và thiết lập tầng Rate Limiting bảo vệ hệ thống. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/gateway-delivery-ws-routing.md) |
| `frontend-design-taste-refactor` | `customer` | #80 | `[COMPLETED]` | Refactor toàn diện giao diện Frontend (Next.js) theo chuẩn Taste Skill (Anti-Slop Art Direction, Dark-Room Tone, phân tách Page vs App Screen, giữ nguyên 100% Business Logic). | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/frontend/frontend-design-taste-refactor.md) |
| `high-concurrency-cache-stampede-and-atomic-inventory` | `platform` | #81 | `[DRAFT]` | Chống Cache Stampede khi 50.000 RPS ùa vào lúc TTL hết hạn (Singleflight Lock & XFetch Algorithm) và trừ tồn kho nguyên tử Redis Lua Script chống Overselling. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/high-concurrency-cache-stampede-and-atomic-inventory.md) |
| `distributed-transaction-saga-outbox-and-idempotency` | `platform` | #82 | `[DRAFT]` | Xử lý giao dịch phân tán Saga Orchestration với Compensating Transactions, cơ chế Transactional Outbox đảm bảo Zero Data Loss và Two-Tier Idempotency Key chống trừ tiền 2 lần. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/distributed-transaction-saga-outbox-and-idempotency.md) |
| `realtime-geospatial-ingestion-and-driver-dispatch` | `platform` | #83 | `[DRAFT]` | Hệ thống Ingestion 3.300 writes/s định vị GPS từ 10.000 tài xế bằng Redis Geospatial / Uber H3, giải phóng DB quan hệ, cơ chế WebSocket Backpressure và thuật toán ghép cuốc dưới 2ms. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md) |
| `dynamic-surge-pricing-and-cart-versioning-engine` | `platform` | #84 | `[DRAFT]` | Pipeline Engine định giá động thời gian thực theo tỷ lệ Cung/Cầu & thời tiết, kết hợp cơ chế Cart Versioning & Price Lock Ticket (TTL 5 phút) có chữ ký số HMAC chống lệch tiền khi đặt đơn. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md) |
| `cqrs-search-catalog-and-resilience-circuit-breaker` | `platform` | #85 | `[DRAFT]` | Tách biệt đường Ghi (PostgreSQL ACID) và đường Đọc (OpenSearch/Elasticsearch) qua CDC/Domain Events (<100ms sync), tích hợp Circuit Breaker 3 trạng thái chống sập dây chuyền. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/platform/cqrs-search-catalog-and-resilience-circuit-breaker.md) |
| `menu-catalog-ui-revamp` | `customer` | #86 | `[COMPLETED]` | Remake toàn diện giao diện trang Thực Đơn (/menu) chuẩn hóa hiện đại: Hero Food Banner, Smart Search kèm Trending Chips, Sticky Category Carousel, Header nhà hàng đầy đủ (avatar, rating, cự ly, CTA ghé quán), và Empty State thân thiện. | [Xem Plan](file:///d:/code/FoodDelivery/docs/plans/customer/menu-catalog-ui-revamp.md) |


---

## 3. Vòng Đời Trạng Thái (Lifecycle Statuses)

Mỗi file kế hoạch có huy hiệu trạng thái tại dòng đầu tiên để phục vụ lọc nhanh:

| Trạng thái | Diễn giải | Giai đoạn phụ trách |
| :--- | :--- | :--- |
| `[DRAFT]` | Bản nháp vừa được lập, đang chờ Người dùng phê duyệt tại Approval Checkpoint. | `@planner` |
| `[APPROVED]` | Kế hoạch đã được phê duyệt, chuẩn bị đưa vào code. | User Approval |
| `[IN_PROGRESS]` | Đang trong giai đoạn hiện thực hóa mã nguồn Backend / Frontend. | `@coder` |
| `[TESTING]` | Đang viết test Vitest 3 nhánh (Happy, Edge, Error) và chạy kiểm thử. | `@tester` |
| `[REVIEWING]` | Đang trong quá trình thẩm định độc lập, rà soát lỗi tiềm ẩn và quy chuẩn. | `@reviewer` |
| `[AUTO_HEALING]` | Đang trong chu trình tự sửa lỗi giữa Coder và Tester/Reviewer. | Auto-Healing Loop |
| `[COMPLETED]` | Đã nghiệm thu 100% test pass, hoàn tất code và đồng bộ tài liệu chính thức. | `@orchestrator` |

---

## 4. Hướng Dẫn Dành Cho Sub-Agents Khi Tạo Plan Mới

1. **Xác định đúng thư mục con**:
   - Nếu tính năng thuộc app Khách hàng ➡️ Tạo tại `docs/plans/customer/<task-name>.md`.
   - Nếu tính năng thuộc app Tài xế ➡️ Tạo tại `docs/plans/driver/<task-name>.md`.
   - Nếu tính năng thuộc Portal Nhà hàng ➡️ Tạo tại `docs/plans/partner/<task-name>.md`.
   - Nếu tính năng thuộc Admin Portal ➡️ Tạo tại `docs/plans/admin/<task-name>.md`.
   - Nếu tính năng hạ tầng, thanh toán, loyalty hoặc đa service ➡️ Tạo tại `docs/plans/platform/<task-name>.md`.
2. **Cập nhật Bảng Tra Cứu (Master Query Matrix)**:
   - Ngay khi tạo file mới ở trạng thái `[DRAFT]`, thêm 1 dòng vào Bảng mục 2 ở trên.
   - Khi hoàn tất task, cập nhật cột Trạng thái thành `[COMPLETED]`.
