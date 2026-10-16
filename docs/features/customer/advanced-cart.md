# Hệ Thống Giỏ Hàng (Advanced Cart) - Tài liệu Nghiệp Vụ

Tài liệu này mô tả chi tiết luồng nghiệp vụ (Business Flow) của hệ thống Giỏ Hàng trong ứng dụng Food Delivery, dưới góc độ trải nghiệm người dùng (End-user) và các quy tắc hệ thống.

## 1. Hành vi Người dùng (User Behaviors)

### 1.1. Thêm món vào giỏ hàng (Add to Cart)
- Người dùng xem thực đơn của một nhà hàng và chọn món ăn.
- Khi bấm nút **[+]** (Thêm vào giỏ hàng), món ăn lập tức được đưa vào giỏ với số lượng mặc định là 1. Trải nghiệm xảy ra ngay lập tức (không có độ trễ) nhờ lưu trữ cục bộ.
- Nếu bấm tiếp vào dấu **[+]** trên cùng món đó, số lượng sẽ tăng lên.
- Nếu bấm dấu **[-]**, số lượng giảm đi. Khi số lượng về 0, món ăn tự động bị xóa khỏi giỏ hàng.

### 1.2. Ràng buộc "Một Nhà Hàng" (Single Restaurant Policy)
Ứng dụng áp dụng quy tắc: **Mỗi lần đặt hàng chỉ được chọn món từ một nhà hàng duy nhất** nhằm tối ưu chi phí vận chuyển (Shipment) và quản lý đơn hàng (Order Routing).
- **Trường hợp lý tưởng:** Khách chỉ mua đồ ở Nhà hàng A.
- **Trường hợp vi phạm:** Khách đang có món của Nhà hàng A trong giỏ, nhưng lại lướt sang màn hình của Nhà hàng B và bấm thêm món.
- **Xử lý:** 
  - Hệ thống sẽ chặn hành động thêm món và hiển thị Popup thông báo: *"Giỏ hàng của bạn đang chứa các món từ nhà hàng [Tên nhà hàng A]. Bạn có muốn xóa giỏ hàng hiện tại để bắt đầu đặt ở nhà hàng mới không?"*
  - Nếu khách chọn **[Đồng ý]**, toàn bộ món của Nhà hàng A bị xoá, món của Nhà hàng B được thêm vào giỏ.
  - Nếu khách chọn **[Hủy]**, món của B không được thêm, giỏ hàng giữ nguyên món của A.

### 1.3. Lựa chọn Biến thể (Options/Toppings) - *Dự kiến*
- Nếu một món ăn có các tùy chọn (Ví dụ: Trà sữa có Size L, Thêm Trân Châu), trước khi thêm vào giỏ, người dùng phải chọn cấu hình.
- Hai ly Trà sữa giống nhau nhưng khác Size (M và L) sẽ được tính là **2 dòng (items) riêng biệt** trong giỏ hàng chứ không gộp chung số lượng.

## 2. Luồng Kiểm Tra & Thanh Toán (Checkout & Validation)

Do giỏ hàng được quản lý siêu tốc ngay trên thiết bị của người dùng (Offline-first / Client-side), chúng ta cần một cơ chế bảo vệ để đảm bảo giá tiền và tính sẵn sàng của món ăn là chính xác 100% trước khi người dùng thực sự thanh toán.

### 2.1. Cập nhật trạng thái tự động (Validation)
Khi người dùng truy cập màn hình **[Giỏ hàng chi tiết]** hoặc **[Thanh toán]**:
1. Ứng dụng sẽ âm thầm gửi toàn bộ danh sách món ăn lên Server để kiểm tra.
2. Server đối chiếu với database hiện tại và phản hồi.
3. Các trường hợp xử lý (Edge cases):
   - **Món ăn bị đổi giá:** Hệ thống tự động cập nhật lại giá tiền trong giỏ hàng theo giá mới nhất trên Server và thông báo: *"Một số món ăn trong giỏ hàng đã thay đổi giá."*
   - **Món ăn đã hết hàng (Sold out):** Hệ thống đánh dấu món ăn đó là "Hết hàng" (mờ đi) và không cho phép thanh toán. Khách hàng bắt buộc phải xóa món đó khỏi giỏ.
   - **Nhà hàng đã đóng cửa:** Nút [Thanh toán] bị vô hiệu hóa.

### 2.2. Tính toán Tổng Tiền (Subtotal)
- **Tạm tính (Subtotal):** Bằng tổng (Giá món * Số lượng).
- **Phí giao hàng (Shipping Fee):** Được tính dựa trên khoảng cách (Geo-distance) từ vị trí user đến nhà hàng ở bước Checkout.
- Sau bước này, user mới tiến hành tạo đơn hàng (Create Order) thực sự.

## 3. Quản lý Phiên (Session Management)

- Giỏ hàng sẽ được gắn với **Thiết bị / Trình duyệt** hiện tại của người dùng (Persistent Local Storage).
- Người dùng chưa đăng nhập (Guest) vẫn có thể xem menu và chọn món vào giỏ bình thường để tăng tỉ lệ chuyển đổi (Conversion rate).
- Sau khi thanh toán thành công (Checkout Success), giỏ hàng tự động bị làm sạch (Clear).
