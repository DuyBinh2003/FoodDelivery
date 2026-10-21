# Restaurant Service

## 1. Tổng quan
Restaurant Service là microservice phụ trách quản lý dữ liệu đối tác nhà hàng, thực đơn (Menu Items), danh mục ẩm thực (Categories), nhãn đặc trưng (Tags), và trạng thái hoạt động mở/đóng cửa (`is_active`) của nhà hàng trên nền tảng Food Delivery.

---

## 2. Tính Năng Cốt Lõi
1. **Quản lý Hồ sơ Nhà hàng (Restaurant Profile):**
   - Tên quán, địa chỉ, vị trí tọa độ (lat/lon), đánh giá (rating), trạng thái duyệt hồ sơ (`verification_status`).
   - Liên kết nhiều danh mục ẩm thực (`m_restaurant_category`: Phở, Bún Bò, Giải khát...).
2. **Kênh Đối tác / Chủ Nhà hàng (Partner / Merchant Portal):**
   - Bật/tắt mở bán nhận đơn theo thời gian thực (`is_active: boolean`).
   - Quản lý thực đơn: Thêm mới, chỉnh sửa giá cả (VNĐ), đổi trạng thái Còn/Hết hàng (`is_available`), gán nhãn tags (`m_menu_item_tag`), phân loại danh mục (`m_category`), và xóa món (Soft Delete).
   - Bảo mật: Xác thực qua `JwtAuthGuard` và kiểm tra quyền sở hữu (`restaurant.owner_id === req.user.id`).
3. **Bảo vệ luồng đặt món (Order Protection Integration):**
   - Cung cấp endpoint nội bộ `GET /internal/restaurants/:id/status` cho `order-service` (`ValidateCartUseCase`).
   - Khi nhà hàng đang tạm đóng cửa (`is_active = false`), đơn hàng sẽ bị từ chối ngay lập tức để tránh phát sinh đơn ngoài giờ hoạt động.

---

## 3. Danh Sách API (RESTful)

### A. Kênh Đối Tác (Yêu cầu JWT Token - `JwtAuthGuard`)

| Endpoint | Method | Mô tả |
| :--- | :---: | :--- |
| `/restaurants/partner/my-restaurant` | `GET` | Lấy thông tin nhà hàng và toàn bộ thực đơn của chủ tài khoản. |
| `/restaurants/partner/my-restaurant/status` | `PATCH` | Bật/tắt trạng thái mở bán nhận đơn (`is_active: boolean`). |
| `/restaurants/partner/my-restaurant/profile` | `PATCH` | Cập nhật tên quán, địa chỉ và các danh mục ẩm thực. |
| `/restaurants/partner/my-restaurant/menu-items` | `GET` | Lấy danh sách món ăn của quán kèm tags và danh mục. |
| `/restaurants/partner/my-restaurant/menu-items` | `POST` | Thêm món ăn mới vào thực đơn (tên, giá bán, giá gốc `original_price`, nhóm tùy chọn `options`, tags, category, mô tả, ảnh). |
| `/restaurants/partner/my-restaurant/menu-items/:itemId` | `PATCH` | Cập nhật món ăn (giá bán, giá gốc, nhóm tùy chọn `options`, trạng thái còn/hết món, tags, category, ảnh). |
| `/restaurants/partner/my-restaurant/menu-items/:itemId` | `DELETE` | Xóa mềm món ăn khỏi thực đơn (`is_deleted = true`). |
| `/restaurants/partner/my-restaurant/tags` | `POST` | Tạo tag nhãn món ăn mới hoặc tái sử dụng tag đã có cho đối tác nhà hàng. |
| `/restaurants/upload` | `POST` | Tải lên ảnh món ăn (`folder: 'dishes'`) hoặc banner nhà hàng (`folder: 'banners'`) lên LocalStack S3. |

### B. Metadata (Công khai / Khách hàng & Đối tác)

| Endpoint | Method | Mô tả |
| :--- | :---: | :--- |
| `/restaurants/categories` | `GET` | Lấy danh sách danh mục ẩm thực (`m_category`). |
| `/restaurants/tags` | `GET` | Lấy danh sách các nhãn đặc trưng (`m_tag`: Món nước, Cay, Bò, Gà...). |
| `/restaurants/tags` | `POST` | Tạo tag nhãn món ăn mới (yêu cầu JWT token). |
| `/restaurants` | `GET` | Lấy danh sách nhà hàng đang hoạt động. |
| `/restaurants/:id` | `GET` | Lấy chi tiết nhà hàng theo ID. |
| `/restaurants/:id/menu-items` | `GET` | Lấy danh sách món ăn của nhà hàng (kèm tags và options từ DB). |

### C. Internal APIs (Giao tiếp giữa các Microservice)

| Endpoint | Method | Mô tả |
| :--- | :---: | :--- |
| `/internal/restaurants/:id/status` | `GET` | Trả về trạng thái `{ id, name, is_active }` cho `order-service` kiểm tra khi validate giỏ hàng. |
| `/internal/restaurants/:id/menu` | `GET` | Trả về danh sách món ăn cho `order-service`. |
| `/internal/restaurants/from-registration` | `POST` | Tạo bản ghi nhà hàng mới sau khi Admin phê duyệt yêu cầu đăng ký mở quán. |

---

## 4. Database Schema (`schema_restaurant`)

- **`m_restaurant`**:
  - `id`: UUID (PK)
  - `owner_id`: UUID (Logical FK tham chiếu `schema_user.m_user`)
  - `name`: VARCHAR(255)
  - `address`: TEXT
  - `banner_url`: TEXT (URL ảnh bìa/banner trên LocalStack S3)
  - `is_active`: BOOLEAN (Mặc định `true`)
  - `verification_status`: VARCHAR(50) (`PENDING`, `APPROVED`, `REJECTED`)
  - `rating`: NUMERIC(3,2)
- **`m_menu_item`**:
  - `id`: UUID (PK)
  - `restaurant_id`: UUID (FK tham chiếu `m_restaurant`)
  - `category_id`: UUID (FK tham chiếu `m_category`, nullable)
  - `name`: VARCHAR(255)
  - `description`: TEXT
  - `price`: NUMERIC(15,2) (Giá bán hiện tại)
  - `original_price`: NUMERIC(15,2) (Giá gốc gạch ngang trước giảm giá, nullable)
  - `options`: JSONB (Danh sách các nhóm tùy chọn modifier: Size radio bắt buộc, Topping checkbox tùy chọn, mức đường/đá)
  - `is_available`: BOOLEAN (Mặc định `true` - Còn món / Hết món)
- **`m_category`**: `id`, `name`, `icon_url`.
- **`m_tag`**: `id`, `name`.
- **`m_restaurant_category`**: Mapping N-N giữa `m_restaurant` và `m_category`.
- **`m_menu_item_tag`**: Mapping N-N giữa `m_menu_item` và `m_tag`.
