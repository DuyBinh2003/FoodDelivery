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
