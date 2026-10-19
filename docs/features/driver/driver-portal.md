# Cổng Thông Tin Tài Xế & Quản Lý Navbar (Driver Portal & Smart Navbar)

Tài liệu mô tả tính năng Cổng thông tin đối tác tài xế (`/driver/dashboard`) và logic kiểm soát hiển thị thông minh trên Navbar.

---

## 1. Quản Lý Thông Minh Trên Navbar

### Luồng Hoạt Động
- Navbar nhận diện trạng thái vai trò và hồ sơ của người dùng thông qua `useAuthStore` (`driverProfile`, `restaurant`, `driverRegistrationStatus`, `restaurantRegistrationStatus`).
- Tự động đồng bộ với backend qua endpoint `GET /users/profile`:
  - **Kênh Tài Xế**:
    - **Đã duyệt tài xế**: Hiển thị menu **"Trung tâm tài xế"** dẫn tới `/driver/dashboard`, kèm chấm trạng thái Online (xanh lá nhấp nháy) hoặc Offline (xám).
    - **Đang chờ duyệt**: Hiển thị badge **"Hồ sơ tài xế (Đang duyệt)"** màu vàng, không hiển thị nút đăng ký.
    - **Chưa đăng ký**: Hiển thị **"Đăng ký làm tài xế"** dẫn tới `/register/driver`.
  - **Kênh Nhà Hàng**:
    - **Đã duyệt mở quán**: Hiển thị menu **"Quán của tôi (Đối tác)"** dẫn tới `/partner/restaurant`.
    - **Đang chờ duyệt**: Hiển thị badge **"Hồ sơ mở quán (Đang duyệt)"** màu vàng, không hiển thị nút đăng ký.
    - **Chưa đăng ký**: Hiển thị **"Đăng ký mở quán"** dẫn tới `/register/restaurant`.
  - Xóa bỏ hoàn toàn các liên kết trùng lặp cũ (`/driver/register`).
- **Đồng bộ thời gian thực (Real-time Sync)**:
  - Khi người dùng gửi form đăng ký: Store kích hoạt `refreshProfile()` tức thì.
  - Khi Admin phê duyệt yêu cầu trên `/admin/approvals`: WebSocket sự kiện `registration_result` kích hoạt `refreshProfile()` tự động, cập nhật Navbar mà không cần tải lại trang.

---

## 2. Cổng Thông Tin Tài Xế (Driver Portal)

- **Đường dẫn**: `/driver/dashboard` (hoặc `/driver` tự động chuyển hướng).
- **Quyền truy cập**: Dành cho tài khoản đối tác tài xế đã được phê duyệt (`verification_status = 'APPROVED'`).

### Các Tính Năng Chính
1. **Bật/Tắt Trạng Thái Hoạt Động (Driver Status Switch)**:
   - Công tắc chuyển đổi giữa **Trực Tuyến (Online)** và **Ngoại Tuyến (Offline)**.
   - Trực tuyến: Đèn LED xung nhịp (`animate-ping`), báo hiệu sẵn sàng nhận cuốc.
   - Ngoại tuyến: Đèn LED xám, báo hiệu tạm dừng nhận đơn.
   - API: `PATCH /users/profile/driver/status` cập nhật trường `status` trong `schema_user.m_driver_profile`.

2. **Thống Kê Chỉ Số Hiệu Suất & Thu Nhập (Driver Metrics)**:
   - **Tổng thu nhập**: Tổng số tiền tài xế nhận được từ các chuyến xe thành công.
   - **Hôm nay**: Thu nhập và số cuốc xe chạy trong ngày.
   - **Tổng số cuốc**: Tổng số chuyến đi đã nhận và hoàn thành.
   - **Đánh giá trung bình**: Số sao trung bình từ khách hàng (1 - 5 ★).

3. **Lịch Sử Cuốc Xe Chi Tiết (Trip History)**:
   - **Lộ trình di chuyển**:
     - 🟢 **Điểm đón (Lấy món)**: Tên nhà hàng & Địa chỉ nhà hàng.
     - 🔴 **Điểm đến (Giao khách)**: Địa chỉ giao hàng của khách hàng.
   - **Cơ chế tính cước & thu nhập chuyến xe**:
     - **Cước giao hàng cố định**: `15.000 VNĐ` (áp dụng mặc định khi chưa tích hợp GPS tính km).
     - **Phí nền tảng ứng dụng (10%)**: Khấu trừ `-1.500 VNĐ` nộp về ví doanh thu sàn qua bút toán kép kế toán `SYS_REVENUE_PLATFORM_COMMISSION`.
     - **Thu nhập thực nhận**: `+13.500 VNĐ` ghi Có vào tài khoản ví của tài xế.
   - **Hiển thị minh bạch trên giao diện**:
     - Thẻ cuốc xe và màn hình nhận chuyến hiển thị rõ: *Cước ship: 15.000 ₫ • Phí sàn (10%): -1.500 ₫ ➔ Tài xế thực nhận: +13.500 ₫*.
   - **Tổng tiền đơn hàng**: Giá trị thanh toán của đơn (tiền món ăn + cước 15.000 ₫).
   - **Danh sách món ăn**: Số lượng, tên món và đơn giá.
   - **Trạng thái**: Hoàn thành (`COMPLETED`), Đang giao (`DELIVERING`), v.v.
   - **Bộ lọc & Tìm kiếm**: Lọc theo tab (Tất cả, Đang giao, Đã hoàn thành) và ô tìm kiếm theo tên quán hoặc địa chỉ.
   - **Thao tác**: Nút "Hoàn thành cuốc xe" cho phép tài xế chuyển trạng thái từ `DELIVERING` sang `COMPLETED`.

4. **Đánh Giá Của Khách Hàng (Customer Reviews)**:
   - Thẻ thống kê điểm sao trung bình và thanh tỉ lệ phần trăm cho từng mức sao (5★, 4★, 3★, 2★, 1★).
   - Danh sách nhận xét chi tiết của khách hàng kèm ngày giờ và cuốc xe tương ứng.

---

## 3. Danh Sách Endpoint API Mới

| Phương Thức | Đường Dẫn | Service | Mô Tả |
|------------|----------|---------|-------|
| `GET` | `/users/profile` | user-service | Trả về thông tin profile, driver profile, nhà hàng và trạng thái đăng ký |
| `PATCH` | `/users/profile/driver/status` | user-service | Cập nhật trạng thái trực tuyến/ngoại tuyến của tài xế |
| `GET` | `/internal/restaurants/by-owner/:ownerId` | restaurant-service | Tra cứu nhà hàng theo `owner_id` |
| `GET` | `/internal/restaurants/:id/details` | restaurant-service | Lấy tên và địa chỉ của nhà hàng phục vụ cuốc xe |
| `GET` | `/orders/driver/trips` | order-service | Lấy danh sách lịch sử cuốc xe của tài xế |
| `GET` | `/orders/driver/summary` | order-service | Lấy thống kê tổng quan (thu nhập, số chuyến, sao trung bình) |
| `GET` | `/orders/driver/reviews` | order-service | Lấy danh sách đánh giá của khách hàng dành cho tài xế |
| `PATCH` | `/orders/driver/trips/:id/status` | order-service | Tài xế cập nhật trạng thái cuốc xe (ví dụ: hoàn thành đơn) |
