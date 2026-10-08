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
- `m_driver_profile` (id, user_id, status, current_location_lat, current_location_lng)

Mọi thao tác quản lý, tạo mới Profile đều được thực hiện thông qua `UserWriteRepository` và API tương ứng.
