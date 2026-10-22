# User Service

## Tổng quan
User Service chịu trách nhiệm quản lý thông tin tài khoản, xác thực (Authentication), và định danh (Authorization) cho toàn bộ hệ thống.

## Cấu trúc Role & Profile Mở rộng (Add-ons)
Hệ thống sử dụng mô hình linh hoạt với 2 cấp độ:
1. **Core Roles (Cơ bản):**
   - `USER`: Khách hàng thông thường, có thể đặt đồ ăn.
   - `ADMIN`: Quản trị viên hệ thống.
2. **Profile Mở rộng (Add-ons):**
   Thay vì chia nhỏ role thành `DRIVER` hay `RESTAURANT_OWNER`, một `USER` có thể sở hữu đồng thời nhiều Profile khác nhau. 
   - `CustomerProfile` (Mặc định được tạo khi đăng ký mới): Chứa thông tin tên, số điện thoại để nhận hàng.
   - `DriverProfile`: Khi user đăng ký làm tài xế, hệ thống cấp phát thêm `DriverProfile` cho account đó, cho phép họ nhận đơn giao hàng.
   - `Restaurant`: Nếu user đăng ký mở quán, họ sẽ trở thành chủ sở hữu của một hoặc nhiều nhà hàng trong bảng `m_restaurant`.

## Database Schema
Các bảng chính liên quan:
- `m_user` (id, email, password_hash, role, avatar_url)
- `m_customer_profile` (id, user_id, full_name, phone)
- `m_driver_profile` (id, user_id, status, verification_status, vehicle_plate, vehicle_type, current_location_lat, current_location_lng)
- `m_user_address` (id, user_id, recipient_name, recipient_phone, label, street_address, ward, district, city, full_address, latitude, longitude, delivery_notes, is_default, created_at, updated_at)
- `m_loyalty_wallet` (id, user_id, available_points, lifetime_points, tier, created_at, updated_at): Quản lý ví điểm và hạng thành viên (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`).
- `t_loyalty_transaction` (id, wallet_id, user_id, transaction_type, points, balance_after, reference_type, reference_id, idempotency_key, description, created_at): Nhật ký giao dịch điểm bất biến (Append-Only ledger).

Mọi thao tác quản lý, tạo mới Profile, Sổ địa chỉ và Ví điểm thưởng đều được thực hiện thông qua Repository tương ứng (`UserWriteRepository`, `UserAddressRepository`, `LoyaltyRepository`).

---

## 3. Danh Sách API (RESTful)

### A. Public / Client-Facing APIs (Qua API Gateway)
| Endpoint | Method | Auth Guard | Mô tả | Request Body | Response Codes |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `/auth/register` | `POST` | Public | Đăng ký tài khoản người dùng mới | `{ email, password, name }` | `201`, `400`, `409` |
| `/auth/login` | `POST` | Public | Đăng nhập và nhận cặp tokens (`access_token` 15m + `refresh_token` 7d) | `{ email, password }` | `200`, `401` |
| `/auth/refresh` | `POST` | Public | Xoay vòng token (RTR), cấp token mới và phát hiện Replay Attack | `{ refresh_token }` | `200`, `401` |
| `/auth/logout` | `POST` | `JwtAuthGuard` | Đăng xuất, đưa access token vào Redis Blacklist và xóa refresh token | `{ refresh_token? }` | `200`, `401` |
| `/users/profile` | `GET` | `JwtAuthGuard` | Lấy thông tin user hiện tại kèm các Profile mở rộng | Không | `200`, `401` |
| `/users/avatar` | `POST` | `JwtAuthGuard` | Tải lên ảnh đại diện cá nhân lưu trữ trên LocalStack S3 | `multipart/form-data: file` (Max 5MB) | `200`, `400`, `401` |
| `/users/profile/driver/status` | `PATCH` | `JwtAuthGuard` | Tài xế chuyển đổi trạng thái `ONLINE` / `OFFLINE` | `{ "status": "ONLINE" \| "OFFLINE" }` | `200`, `401` |
| `/users/registrations` | `POST` | `JwtAuthGuard` | Nộp hồ sơ đăng ký đối tác (Tài xế / Nhà hàng) | `{ type: "DRIVER", payload: {...} }` | `201`, `400`, `409` |
| `/users/addresses` | `GET` | `JwtAuthGuard` | Lấy danh sách sổ địa chỉ của người dùng | Không | `200`, `401` |
| `/users/addresses` | `POST` | `JwtAuthGuard` | Thêm địa chỉ mới kèm tọa độ GPS (WGS84) | `{ recipient_name, recipient_phone, label, street_address, ward, district, city, full_address, latitude, longitude, delivery_notes?, is_default? }` | `201`, `400`, `401` |
| `/users/addresses/:id` | `PATCH` | `JwtAuthGuard` | Cập nhật thông tin địa chỉ | `{ recipient_name?, recipient_phone?, label?, street_address?, full_address?, latitude?, longitude?, ... }` | `200`, `400`, `401`, `404` |
| `/users/addresses/:id/default` | `PATCH` | `JwtAuthGuard` | Đặt một địa chỉ làm mặc định | Không | `200`, `401`, `404` |
| `/users/addresses/:id` | `DELETE` | `JwtAuthGuard` | Xóa địa chỉ khỏi sổ địa chỉ | Không | `200`, `401`, `404` |
| `/loyalty/my-points` | `GET` | `JwtAuthGuard` | Lấy số dư điểm tích lũy, hạng thành viên, tiến độ thăng hạng và 20 giao dịch gần nhất | Không | `200`, `401` |

### B. Internal APIs (Giao tiếp nội bộ Docker, NGINX chặn bên ngoài)
| Endpoint | Method | Service Gọi | Mục đích & Mô tả | Phản hồi |
| :--- | :---: | :--- | :--- | :--- |
| `/internal/users/metrics` | `GET` | `admin-service` | Lấy tổng số lượng user và driver | `{ totalUsers, totalDrivers }` |
| `/internal/users/pending-approvals` | `GET` | `admin-service` | Lấy danh sách hồ sơ đăng ký đang chờ duyệt | `{ restaurants: [], drivers: [] }` |
| `/internal/registrations/:id/review` | `POST` | `admin-service` | Quản trị viên duyệt hoặc từ chối đơn đăng ký | `{ id, type, status, ... }` |
| `/internal/drivers/:userId/status` | `GET` | `order-service` | Kiểm tra trạng thái hoạt động của tài xế (`is_active: status === 'ONLINE' && verification_status === 'APPROVED'`) trước khi gửi hoặc nhận cuốc xe | `{ is_driver, id, user_id, status, verification_status, is_active, vehicle_plate, vehicle_type }` |
| `/internal/users/:id/addresses` | `GET` | `order-service` | Lấy danh sách địa chỉ của người dùng theo UUID | `[ { id, full_address, latitude, longitude, ... } ]` |
| `/internal/users/:id/default-address` | `GET` | `order-service` | Lấy địa chỉ giao hàng mặc định của người dùng | `{ id, full_address, latitude, longitude, ... }` |
| `/internal/loyalty/burn` | `POST` | `order-service` | Trừ điểm khi đặt đơn hàng (Kèm `idempotency_key`, trần 50% subtotal) | `{ success, points_burned, discount_amount, remaining_points, transaction_id }` |
| `/internal/loyalty/earn` | `POST` | `order-service` | Tích điểm cho khách hàng khi đơn `COMPLETED` theo hệ số Hạng | `{ success, points_earned, new_balance, new_tier, transaction_id }` |
| `/internal/loyalty/refund` | `POST` | `order-service` | Hoàn trả điểm đã sử dụng khi đơn hàng bị hủy `CANCELLED` | `{ success, points_refunded, remaining_points, transaction_id }` |
| `/internal/loyalty/wallet/:userId` | `GET` | `order-service` | Lấy thông tin ví điểm và hạng thành viên nội bộ | `{ wallet, tier_progress, recent_transactions }` |


