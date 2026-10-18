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
- `m_user` (id, email, password_hash, role)
- `m_customer_profile` (id, user_id, full_name, phone)
- `m_driver_profile` (id, user_id, status, verification_status, vehicle_plate, vehicle_type, current_location_lat, current_location_lng)

Mọi thao tác quản lý, tạo mới Profile đều được thực hiện thông qua `UserWriteRepository` và API tương ứng.

---

## 3. Danh Sách API (RESTful)

### A. Public / Client-Facing APIs (Qua API Gateway)
| Endpoint | Method | Auth Guard | Mô tả | Request Body | Response Codes |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `/auth/register` | `POST` | Public | Đăng ký tài khoản người dùng mới | `{ email, password, name }` | `201`, `400`, `409` |
| `/auth/login` | `POST` | Public | Đăng nhập và nhận JWT token | `{ email, password }` | `200`, `401` |
| `/users/profile` | `GET` | `JwtAuthGuard` | Lấy thông tin user hiện tại kèm các Profile mở rộng | Không | `200`, `401` |
| `/users/profile/driver/status` | `PATCH` | `JwtAuthGuard` | Tài xế chuyển đổi trạng thái `ONLINE` / `OFFLINE` | `{ "status": "ONLINE" \| "OFFLINE" }` | `200`, `401` |
| `/users/registrations` | `POST` | `JwtAuthGuard` | Nộp hồ sơ đăng ký đối tác (Tài xế / Nhà hàng) | `{ type: "DRIVER", payload: {...} }` | `201`, `400`, `409` |

### B. Internal APIs (Giao tiếp nội bộ Docker, NGINX chặn bên ngoài)
| Endpoint | Method | Service Gọi | Mục đích & Mô tả | Phản hồi |
| :--- | :---: | :--- | :--- | :--- |
| `/internal/users/metrics` | `GET` | `admin-service` | Lấy tổng số lượng user và driver | `{ totalUsers, totalDrivers }` |
| `/internal/users/pending-approvals` | `GET` | `admin-service` | Lấy danh sách hồ sơ đăng ký đang chờ duyệt | `{ restaurants: [], drivers: [] }` |
| `/internal/registrations/:id/review` | `POST` | `admin-service` | Quản trị viên duyệt hoặc từ chối đơn đăng ký | `{ id, type, status, ... }` |
| `/internal/drivers/:userId/status` | `GET` | `order-service` | Kiểm tra trạng thái hoạt động của tài xế (`is_active: status === 'ONLINE' && verification_status === 'APPROVED'`) trước khi gửi hoặc nhận cuốc xe | `{ is_driver, id, user_id, status, verification_status, is_active, vehicle_plate, vehicle_type }` |
