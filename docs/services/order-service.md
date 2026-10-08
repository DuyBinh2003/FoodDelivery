# Order Service

Order Service chịu trách nhiệm quản lý logic tạo đơn hàng, tính toán tổng tiền và state machine cho các trạng thái đơn hàng (PENDING, ACCEPTED, COOKING, DELIVERING, COMPLETED).

## Cấu trúc Database
- **`t_order`**: Chứa thông tin tổng quan của đơn hàng (`customer_id`, `restaurant_id`, `status`, `total_amount`).
- **`t_order_item`**: Chứa các món ăn chi tiết thuộc về đơn hàng đó.
Hai bảng này nằm trong schema riêng `schema_order` và giao tiếp qua UUID với các service khác (Logical Reference).

## API Endpoints

### 1. Tạo đơn hàng (`POST /orders`)
- **Mô tả**: Tạo đơn hàng và chi tiết món ăn trong một transaction.
- **Side effect**: Sau khi lưu DB thành công, Order Service sẽ push 1 message chứa event `ORDER_CREATED` vào SQS Queue.

### 2. Cập nhật trạng thái (`PATCH /orders/:id/status`)
- **Mô tả**: API để các hệ thống khác (hoặc admin) cập nhật trạng thái đơn.
- **Trạng thái hợp lệ**: `PENDING`, `ACCEPTED`, `COOKING`, `DELIVERING`, `COMPLETED`, `CANCELLED`.

### 3. Xem lịch sử đơn hàng (`GET /orders/history/me`)
- **Mô tả**: Lấy danh sách các đơn hàng đã đặt của người dùng hiện tại (kèm chi tiết món và review nếu có).
- **Phân quyền**: Chỉ trả về các đơn hàng thuộc về `customer_id` của người gọi API.

### 4. Đánh giá đơn hàng (`POST /orders/:id/reviews`)
- **Mô tả**: Gửi đánh giá cho một đơn hàng đã hoàn thành (`COMPLETED`).
- **Body**: 
  - `restaurant_rating`, `driver_rating`, `food_rating` (1-5 sao)
  - `comment` (văn bản)
  - `image_urls` (mảng hình ảnh)
