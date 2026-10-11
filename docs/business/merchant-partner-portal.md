# Tài Liệu Nghiệp Vụ: Kênh Quản Lý Dành Cho Đối Tác Nhà Hàng (Merchant Portal)

## 1. Mục Đích & Bối Cảnh
Sau khi người dùng gửi form đăng ký mở quán tại `/register/restaurant` và được Admin xét duyệt (`APPROVED`), người dùng chính thức trở thành **Chủ sở hữu nhà hàng (Restaurant Owner)**. Kênh Đối tác (`/partner/restaurant`) cung cấp công cụ tự quản trị toàn diện giúp chủ quán:
- Chủ động mở bán hoặc tạm nghỉ nhận đơn hàng theo giờ giấc kinh doanh.
- Quản lý giá bán, thực đơn, hình ảnh và gắn nhãn các món đặc sản.
- Tránh tình trạng khách hàng đặt món khi quán đã đóng cửa hoặc hết nguyên liệu.

---

## 2. Luồng Nghiệp Vụ Chính

```mermaid
graph TD
    A[Chủ nhà hàng đăng nhập] --> B{Kiểm tra sở hữu nhà hàng}
    B -- Chưa có quán hoặc Đang chờ duyệt --> C[Hiển thị màn hình hướng dẫn & Link Đăng ký]
    B -- Đã có quán được duyệt --> D[Truy cập Kênh Đối Tác /partner/restaurant]

    D --> E[Quản lý trạng thái mở bán]
    E -->|Gạt Switch Bật| E1[is_active = true: Khách hàng tìm thấy và đặt món]
    E -->|Gạt Switch Tắt| E2[is_active = false: Hệ thống từ chối đơn hàng mới]

    D --> F[Quản lý Thực Đơn & Giá Cả]
    F --> F1[Thêm món: Tên, Giá, Ảnh, Danh mục, Tags]
    F --> F2[Sửa món: Điều chỉnh giá bán, cập nhật mô tả]
    F --> F3[Switch Còn/Hết món: is_available]
    F --> F4[Xóa món: Soft delete]

    D --> G[Cập nhật Hồ sơ Quán]
    G --> G1[Sửa tên quán, địa chỉ, thể loại ẩm thực]
```

---

## 3. Quy Tắc Nghiệp Vụ (Business Rules)

### 3.1. Trạng Thái Hoạt Động (`is_active`)
- **Mở cửa nhận đơn (`is_active = true`):**
  - Quán hiển thị trạng thái hoạt động bình thường trên trang chủ và danh sách tìm kiếm.
  - Khách hàng có thể thêm món vào giỏ và đặt hàng thành công.
- **Tạm đóng cửa (`is_active = false`):**
  - Quán hiển thị trạng thái "Tạm đóng cửa" / "Nghỉ bán".
  - Tại bước thanh toán / kiểm tra giỏ hàng (`POST /orders/validate-cart`), `order-service` tự động gọi sang `restaurant-service` kiểm tra `is_active`. Nếu quán đang tắt, hệ thống sẽ từ chối đơn hàng với thông báo: *"Nhà hàng hiện đang tạm đóng cửa, không nhận đơn đặt món."*

### 3.2. Quản Lý Thực Đơn & Giá Cả
- **Giá bán (VNĐ):** Bắt buộc phải là số dương lớn hơn 0.
- **Trạng thái Còn món (`is_available`):**
  - Khi chủ quán chuyển một món sang "Hết món", khách hàng không thể đặt món này.
  - Khi chủ quán bật "Còn món", khách hàng có thể đặt lại ngay lập tức.
- **Tags & Category:**
  - Danh mục món ăn (`category_id`): Giúp gom nhóm món ăn (Phở, Bún bò, Giải khát...).
  - Nhãn tag (`tag_ids`): Gắn các thuộc tính đặc trưng như `#Món nước`, `#Cay`, `#Bò`, `#Gà`, `#Ăn vặt`.

### 3.3. Bảo Mật & Phân Quyền
- Tất cả các endpoint quản trị đối tác (`/restaurants/partner/...`) đều yêu cầu Bearer JWT token hợp lệ.
- Hệ thống luôn kiểm tra `restaurant.owner_id === req.user.id`. Tuyệt đối không cho phép chủ quán này thao tác trên quán của người khác.
