# Admin Service

## Tổng quan
Admin Service là phân hệ lõi đóng vai trò **Admin BFF (Backend-For-Frontend)** để quản lý toàn bộ hoạt động của nền tảng Food Delivery. Nó cung cấp các công cụ kiểm soát kinh doanh, vận hành, giám sát ví doanh thu nền tảng và quản lý rủi ro cho Quản trị viên (`ADMIN`).

## Tính Năng Cốt Lõi
1. **Ví Doanh Thu Nền Tảng & Sổ Cái Kép (Platform Treasury & Double-Entry Ledger):**
   - Quản lý tài khoản doanh thu nền tảng `SYS_REVENUE_PLATFORM_COMMISSION` tại `payment-service`.
   - Thu nhận dòng tiền hoa hồng tự động: chiết khấu từ đơn món ăn của nhà hàng (`RESTAURANT_COMMISSION_RATE` 15-20%) và chiết khấu cuốc xe giao hàng của tài xế (`DRIVER_FEE_RATE` 10%).
   - Cung cấp số dư khả dụng, biến động số dư theo thời gian, phân tích nguồn thu, và danh sách bút toán sổ cái kép minh bạch (`t_ledger_transaction`, `t_ledger_entry`).
2. **BFF Dashboard & Trực Quan Hóa (Data Visualization):**
   - Tổng hợp dữ liệu chỉ số từ `user-service`, `restaurant-service`, `order-service` và `payment-service`.
   - Cung cấp dữ liệu chuỗi thời gian (Timeseries) và phân bổ trạng thái đơn theo khoảng thời gian (`7d`, `30d`, `all`).
   - Tích hợp cơ chế **Graceful Degradation**: nếu luồng dữ liệu thời gian thực từ Order Service gián đoạn, hệ thống tự động trả về số liệu snapshot an toàn mà không làm lỗi giao diện người dùng.
3. **Quản Lý Giao Dịch & Cuốc Xe (Transactions & Trips Management):**
   - Tra cứu, phân trang, lọc theo trạng thái (`PENDING`, `COOKING`, `READY_FOR_PICKUP`, `DELIVERING`, `COMPLETED`, `CANCELLED`).
   - Theo dõi cự ly di chuyển GPS Haversine (`distance_km`), tài xế phụ trách và lộ trình đơn hàng.
4. **Quản Lý Tài Nguyên Gốc (Master Resources Management):**
   - Quản lý tài khoản người dùng (`m_user`) và đối tác tài xế (`m_driver_profile` kèm biển số xe, loại phương tiện, trạng thái trực tuyến).
   - Quản lý danh sách nhà hàng đối tác (`m_restaurant`), địa chỉ, xếp hạng đánh giá và trạng thái mở bán (`is_active`).
5. **Quản Lý Xét Duyệt & Cấu Hình Tài Chính (Approvals & System Config):**
   - Gatekeeper thẩm định hồ sơ mở quán và tài xế đối tác.
   - Quản lý các biến số kinh doanh thông qua bảng `m_system_config` (`RESTAURANT_COMMISSION_RATE`, `DRIVER_FEE_RATE`, `TAX_RATE`).

## Danh Sách API (RESTful)

Tất cả các API dưới đây đều yêu cầu Authentication (JWT) và Authorization với Role là `ADMIN`.

| Endpoint | Method | Mô tả |
| :--- | :---: | :--- |
| `/admin/metrics/dashboard` | `GET` | Lấy dữ liệu thống kê tổng quát (Total GMV, Orders, Users, Drivers, Restaurants, Treasury Balance). |
| `/admin/analytics/dashboard` | `GET` | Lấy dữ liệu phân tích trực quan hóa (Timeseries, Status Distribution, Revenue Breakdown) theo query `?range=7d\|30d\|all`. |
| `/admin/wallet/summary` | `GET` | Lấy thông tin ví doanh thu nền tảng, số dư khả dụng và danh sách bút toán sổ cái kép (phân trang). |
| `/admin/orders` | `GET` | Lấy danh sách đơn hàng & cuốc xe (hỗ trợ phân trang, lọc `status`, tìm kiếm `search`). |
| `/admin/users` | `GET` | Lấy danh sách người dùng thành viên (phân trang, lọc `role`, tìm kiếm `search`). |
| `/admin/drivers` | `GET` | Lấy danh sách đối tác tài xế (phân trang, lọc `status`, tìm kiếm `search`). |
| `/admin/restaurants` | `GET` | Lấy danh sách quán ăn đối tác (phân trang, lọc `status`, tìm kiếm `search`). |
| `/admin/approvals/pending` | `GET` | Lấy danh sách hồ sơ (Tài xế + Nhà hàng) đang chờ duyệt (`PENDING`). |
| `/admin/approvals/restaurant/:id/approve` | `POST` | Xác nhận duyệt hồ sơ nhà hàng. Chuyển status thành `APPROVED`. |
| `/admin/approvals/restaurant/:id/reject` | `POST` | Từ chối hồ sơ nhà hàng. Chuyển status thành `REJECTED`. |
| `/admin/approvals/driver/:id/approve` | `POST` | Xác nhận duyệt hồ sơ tài xế. Chuyển status thành `APPROVED`. |
| `/admin/approvals/driver/:id/reject` | `POST` | Từ chối hồ sơ tài xế. Chuyển status thành `REJECTED`. |
| `/admin/configs` | `GET` | Lấy toàn bộ danh sách cấu hình hệ thống (Finance, Operations, Pagination, System Flags). |
| `/admin/configs` | `PUT` | Cập nhật giá trị đơn lẻ của một cấu hình (`key`, `value`). |
| `/admin/configs/bulk` | `PUT` | Cập nhật hàng loạt nhiều cấu hình hệ thống (`configs: Array<{ key, value }>`) trong một transaction nguyên tử. |

## Hệ Thống Cấu Hình Toàn Diện (`m_system_config`)
Bảng `m_system_config` trong schema `public` lưu trữ 11 biến số nền tảng phục vụ 4 nhóm chuyên sâu:

1. **💰 Tài chính & Thuế (Finance & Rates):**
   - `RESTAURANT_COMMISSION_RATE` (Mặc định: `20%`): Tỷ lệ hoa hồng chiết khấu nhà hàng.
   - `DRIVER_FEE_RATE` (Mặc định: `10%`): Tỷ lệ phí nền tảng trích thu từ cuốc xe tài xế.
   - `TAX_RATE` (Mặc định: `8%`): Thuế suất VAT áp dụng cho giao dịch.
   - `BASE_DELIVERY_FEE_VND` (Mặc định: `15.000 VNĐ`): Mức cước phí giao hàng cơ sở tối thiểu.
   - `MIN_ORDER_AMOUNT_VND` (Mặc định: `20.000 VNĐ`): Giá trị đơn hàng tối thiểu khách được phép đặt.
2. **🛵 Vận hành & Điều phối (Operations & Dispatch):**
   - `MAX_DELIVERY_RADIUS_KM` (Mặc định: `15 km`): Bán kính giao hàng tối đa giữa quán và khách.
   - `DRIVER_ACCEPT_TIMEOUT_SECONDS` (Mặc định: `30s`): Thời gian đếm ngược tài xế phản hồi nhận cuốc.
   - `AUTO_CANCEL_UNACCEPTED_ORDER_MINUTES` (Mặc định: `15 phút`): Thời gian tự hủy đơn nếu không có quán hoặc tài xế nhận.
3. **📄 Phân trang & Giới hạn (Pagination & Limits):**
   - `DEFAULT_PAGE_SIZE` (Mặc định: `15 dòng/trang`): Kích thước phân trang mặc định cho các danh sách (Orders, Users, Drivers, Restaurants, Wallet).
   - `MAX_EXPORT_LIMIT` (Mặc định: `500 dòng`): Giới hạn tối đa số bản ghi khi trích xuất dữ liệu.
4. **🛡️ Hệ thống & Bảo mật (System Flags):**
   - `MAINTENANCE_MODE` (Mặc định: `false`): Chế độ bảo trì hệ thống toàn sàn.
   - `AUTO_APPROVE_PARTNERS` (Mặc định: `false`): Tự động phê duyệt hồ sơ đối tác khi đăng ký mới.

## Database Schema
- **Bảng `m_system_config` (Schema `public`):** `id`, `config_key`, `config_value`, `description`.
- **Trường `verification_status`:** Thêm vào bảng `m_driver_profile` và `m_restaurant` để hỗ trợ flow xét duyệt.
