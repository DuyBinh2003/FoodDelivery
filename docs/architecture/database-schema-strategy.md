# Database Schema Strategy

## 1. Mô hình Schema-per-Service

Dự án áp dụng mô hình kiến trúc cơ sở dữ liệu **Schema-per-Service** bên trong cùng một instance PostgreSQL (`food_delivery`).

### Mục đích:
Thay vì tạo ra nhiều database rời rạc làm tốn tài nguyên trên môi trường dev/staging, hoặc gom chung tất cả bảng vào schema `public` (phá vỡ nguyên tắc Microservices), chúng ta sử dụng Schema của PostgreSQL để phân định ranh giới (isolation):

- Mỗi Microservice chỉ có quyền đọc/ghi vào **Schema riêng** của nó.
- Nếu Service A cần dữ liệu của Service B, nó **KHÔNG ĐƯỢC PHÉP** query chéo sang schema của B (Cross-schema query là tối kỵ). Nó bắt buộc phải gọi HTTP Internal API của Service B hoặc lắng nghe Events.

### Cấu trúc:
- User Service -> Schema: `schema_user`
- Restaurant Service -> Schema: `schema_restaurant`
- Order Service -> Schema: `schema_order`
- Admin Service -> Schema: `schema_admin`
- Delivery Service -> Schema: `schema_delivery`
- Payment Service -> Schema: `schema_payment` (Sổ cái kép Double-Entry & Ví đối tác)
- AI Service -> Schema: `schema_ai` (Session lịch sử hội thoại & pgvector RAG)

## 2. Chiến lược Migrations khi tách Microservices

Trước đây, thư mục `backend/migrations/` chứa chung script của tất cả service. Khi chuyển sang Monorepo, chúng ta quản lý migration phân tán:

### Tổ chức thư mục mới
```text
backend/
├── migrations/
│   ├── user-service/
│   │   ├── 12345_create_users.js
│   ├── restaurant-service/
│   │   ├── 12346_create_restaurants.js
│   ├── order-service/
│   └── ...
```

### Cách chạy Migration (`node-pg-migrate`)
Bởi vì mỗi service dùng chung 1 database nhưng khác schema, `node-pg-migrate` cần được cấu hình chạy riêng cho từng thư mục migration và sử dụng **bảng migration riêng** để tracking.

Trong `backend/package.json`, các script sẽ được chia ra:
```json
{
  "scripts": {
    "migrate:user:up": "node-pg-migrate -m migrations/user-service --migrations-table pgmigrations_user up",
    "migrate:restaurant:up": "node-pg-migrate -m migrations/restaurant-service --migrations-table pgmigrations_restaurant up"
  }
}
```
*(Bảng `pgmigrations_user`, `pgmigrations_restaurant` sẽ được tự động tạo trong schema `public` để track lịch sử riêng biệt).*

## 3. Quy chuẩn đặt tên bảng
Áp dụng tiêu chuẩn tiền tố:
- `m_` (Master Data): Dữ liệu tĩnh, ít thay đổi (VD: `m_user`, `m_restaurant`, `m_category`).
- `t_` (Transaction Data): Dữ liệu phát sinh liên tục (VD: `t_order`, `t_order_item`, `t_order_review`).

## 4. UUID làm Khóa Chính
Toàn bộ khóa chính trong hệ thống phải sử dụng `UUID (v4)`. Điều này vô cùng quan trọng trong Microservices vì:
- Tránh đụng độ ID khi merge data.
- Dễ dàng che giấu số lượng bản ghi thực tế (so với ID tự tăng).
- Frontend có thể tự generate ID trước khi gửi request (nhờ thư viện uuid) giúp xử lý offline tốt hơn.

## 5. Chiến lược Seeding Toàn Diện & Task Reset DB

Hệ thống áp dụng chiến lược Seed 2 tầng để vừa giữ sạch lịch sử migration, vừa nạp được khối lượng dữ liệu thực tế cho toàn bộ 7 schemas khi phát triển và demo:

1. **Tầng 1 — Core Demo Fixtures (`backend/migrations/*/178935391700*_seed-*.js`)**:
   - Tạo cố định 6 tài khoản Demo trên màn hình Login (`customer@fooddelivery.com`, `driver1`, `driver2`, `owner@phobien.com`, `owner@bunbo.com`, `admin@fooddelivery.com` — mật khẩu `password123`), 2 nhà hàng lõi và 5 đơn mẫu ban đầu với UUID bất biến.
2. **Tầng 2 — Modular Seeder Engine (`backend/libs/common/src/seeding/` + `backend/scripts/seed-all.ts`)**:
   - Sinh bộ dữ liệu tất định (Mulberry32 PRNG + UUIDv4 deterministic) từ các bảng Master (`m_*`) tới Transaction (`t_*`) trên tất cả 7 schemas (`m_user`, `m_driver_profile`, `m_restaurant`, `m_restaurant_operating_hour`, `m_menu_item`, `m_voucher`, `m_campaign`, `t_order`, `t_order_item`, `t_order_review`, `t_delivery_proof`, `t_order_dispute`, `t_payment_intent`, `t_ledger_transaction`, `t_ledger_entry`, `t_withdrawal_request`, `t_registration_request`, `m_loyalty_wallet`, `t_loyalty_transaction`, `m_knowledge_chunks`, `m_chat_sessions`, `t_chat_messages`).
   - Hỗ trợ 2 mức tải: `standard` (mặc định trong `npm run migrate:reset` / VS Code `DB: Reset`, ~150 quán / ~1.600+ món / 600 đơn) và `large` (`npm run migrate:reset:large`, ~500 quán / ~5.500 món / 3.000 đơn).
   - **Kiểm soát bất biến trước khi ghi DB (`assertDatasetInvariants`)**: Đảm bảo `SUM(DEBIT) == SUM(CREDIT)` ở mọi giao dịch sổ cái, `available_balance + locked_balance` khớp lịch sử `t_ledger_entry`, và tổng đơn `t_order` khớp `t_order_item`.
   - **Đồng bộ hạ tầng phụ trợ tự động**: Sau khi nạp PostgreSQL xong, `seed-all.ts` đồng bộ ảnh SVG lên LocalStack S3, tái tạo & index Elasticsearch (`restaurants`, `menu_items` với analyzer Tiếng Việt & `geo_point`), đồng thời dọn và nạp Redis (`drivers:geo`, `order:inflight:*`), ghi cảnh báo Graceful Warn nếu dịch vụ phụ trợ đang tắt.
