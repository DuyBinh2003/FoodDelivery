# Admin Service

## Tổng quan
Admin Service là phân hệ lõi để quản lý toàn bộ hoạt động của nền tảng Food Delivery. Nó cung cấp các công cụ kiểm soát kinh doanh, vận hành và quản lý rủi ro cho Quản trị viên (`ADMIN`).

## Tính Năng Cốt Lõi
1. **Quản Lý Xét Duyệt (Approval Workflow):** 
   Đóng vai trò gác cổng (Gatekeeper). Các đối tác (Tài xế, Nhà hàng) khi đăng ký mới sẽ bị đưa vào trạng thái `PENDING`. Họ không thể nhận đơn hay bán hàng cho đến khi Admin kiểm tra và bấm duyệt (`APPROVED`).
2. **Cấu Hình Tài Chính (System Config):**
   Hệ thống cho phép lưu trữ và thay đổi linh hoạt các biến số kinh doanh thông qua bảng `m_system_config`:
   - `RESTAURANT_COMMISSION_RATE`: Phần trăm chiết khấu thu từ nhà hàng trên mỗi đơn hàng.
   - `DRIVER_FEE_RATE`: Phần trăm thu từ cước phí vận chuyển của tài xế.
   - `TAX_RATE`: Thuế hệ thống.
3. **Thống Kê (Dashboard):**
   Cung cấp các metrics quan trọng: Tổng doanh thu (GMV), số lượng đơn hàng, lượng đối tác (nhà hàng, tài xế) đang hoạt động.

## Danh Sách API (RESTful)

Tất cả các API dưới đây đều yêu cầu Authentication (JWT) và Authorization với Role là `ADMIN`.

| Endpoint | Method | Mô tả |
| :--- | :---: | :--- |
| `/admin/metrics/dashboard` | `GET` | Lấy dữ liệu thống kê tổng quát (Total GMV, Orders, Users, Drivers, Restaurants). |
| `/admin/approvals/pending` | `GET` | Lấy danh sách hồ sơ (Tài xế + Nhà hàng) đang chờ duyệt (`PENDING`). |
| `/admin/approvals/restaurant/:id/approve` | `POST` | Xác nhận duyệt hồ sơ nhà hàng. Chuyển status thành `APPROVED`. |
| `/admin/approvals/restaurant/:id/reject` | `POST` | Từ chối hồ sơ nhà hàng. Chuyển status thành `REJECTED`. |
| `/admin/approvals/driver/:id/approve` | `POST` | Xác nhận duyệt hồ sơ tài xế. Chuyển status thành `APPROVED`. |
| `/admin/approvals/driver/:id/reject` | `POST` | Từ chối hồ sơ tài xế. Chuyển status thành `REJECTED`. |
| `/admin/configs` | `GET` | Lấy toàn bộ danh sách cấu hình hệ thống (Tax, Commission). |
| `/admin/configs` | `PUT` | Cập nhật giá trị của một cấu hình (`key`, `value`). |

## Database Schema
- **Bảng `m_system_config` (Schema `public`):** `id`, `config_key`, `config_value`, `description`.
- **Trường `verification_status`:** Thêm vào bảng `m_driver_profile` và `m_restaurant` để hỗ trợ flow xét duyệt.
