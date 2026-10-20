# Kế Hoạch Triển Khai: Gộp Migration, Seed Dữ Liệu và Quản Lý Chi Tiết Món Ăn (Tags, Options, Giá Gốc)

> Trạng thái: `[COMPLETED]`  
> Mã Task: `menu-item-tags-and-options-management`  
> Phân hệ: `partner` & `customer` / `restaurant-service` & `frontend`  
> Tham chiếu: Yêu cầu gộp migration 1789390000000, lấy tag từ DB lên popup và cấp quyền tạo chi tiết món ăn (tags/options) cho nhà hàng  
> Phụ trách: Master Orchestrator & Planner  

---

## 1. Bối Cảnh & Mục Tiêu Nghiệp Vụ (Context & Objectives)

### 1.1. Hiện Trạng Codebase
1. **Migration & Seed**:
   - File migration `backend/migrations/restaurant-service/1789390000000_add-menu-item-options.js` được tạo bổ sung để `ADD COLUMN` và `UPDATE` dữ liệu cho 4 món. Tuy nhiên, theo yêu cầu của dự án, các cột `original_price` và `options` cần được tích hợp trực tiếp vào file migration gốc `1788925717338_restaurant-service-tables.js` và dữ liệu seed khởi tạo tại `1789353917002_seed-restaurants.js` để tránh phân mảnh migration.
   - Bảng `schema_restaurant.m_tag` hiện chỉ seed 4 tag sơ sài ('Món Nước', 'Bò', 'Gà', 'Ăn Vặt'), và bảng liên kết `m_menu_item_tag` chỉ gắn tag cho đúng 1 món duy nhất (`Phở Bò Tái`).
2. **Popup Chọn Món (`AddToCartDialog`)**:
   - Do seed thiếu dữ liệu liên kết tag, các món ăn khác trong menu không hiển thị được tag đặc trưng nào từ database.
   - Phần "Ghi chú nhanh cho quán" đang sử dụng hằng số tĩnh (`QUICK_INSTRUCTION_TAGS`) thay vì phản ánh các tùy chọn/tag gắn liền với từng món ăn từ cơ sở dữ liệu.
3. **Trang Quản Lý Nhà Hàng (`/partner/restaurant`)**:
   - Modal tạo/sửa món ăn (`MenuItemDialog`) chưa hỗ trợ:
     - Nhập `original_price` (giá gốc gạch ngang khi giảm giá).
     - Tạo mới Tag hoặc tìm kiếm tag mở rộng khi hệ thống chưa có tag mong muốn.
     - **Bộ cấu hình Tùy chọn Món ăn (Options & Modifiers Builder)**: Chưa cho phép chủ quán tự thiết lập các nhóm tùy chọn (Size, Topping, Mức đường, Mức đá, Ghi chú khẩu vị...), dẫn đến việc quán không thể tùy biến chi tiết món ăn của mình.

---

## 2. Giải Pháp Kỹ Thuật Chi Tiết (Technical Solution)

### 2.1. Backend (`restaurant-service`)
1. **Gộp Migration & Cập Nhật Seed**:
   - Chuyển toàn bộ định nghĩa cột và seed options/tags vào:
     - `1788925717338_restaurant-service-tables.js`: Đảm bảo `m_menu_item` có sẵn `original_price` và `options`.
     - `1789353917002_seed-restaurants.js`:
       - Bổ sung danh sách tag phong phú vào `m_tag`: `Món Nước`, `Bò`, `Gà`, `Hải Sản`, `Cơm`, `Bún/Phở`, `Ăn Vặt`, `Tráng Miệng`, `Giải Khát`, `Trà Sữa`, `Cay Nồng`, `Ít Cay`, `Không Cay`, `Món Chay`, `Healthy`, `Bán Chạy`, `Đặc Sản`.
       - Thêm `original_price` và `options` (Size, Topping, Lượng đá/đường) trực tiếp vào câu lệnh `INSERT INTO schema_restaurant.m_menu_item`.
       - Gắn tag cho 100% các món ăn trong seed qua `schema_restaurant.m_menu_item_tag`.
   - Xóa bỏ file `1789390000000_add-menu-item-options.js` và đồng bộ lại bảng `schema_restaurant.pgmigrations`.
2. **API Quản Lý Tag Mới Cho Đối Tác**:
   - Thêm endpoint `POST /restaurants/partner/my-restaurant/tags` (hoặc `POST /restaurants/tags`) cho phép chủ quán tạo nhanh tag mới nếu chưa có trong danh mục.
3. **API Lưu Chi Tiết Món Ăn (Options, Original Price & Tags)**:
   - Hoàn thiện `CreatePartnerMenuItemDto` và `UpdatePartnerMenuItemDto` hỗ trợ `options`, `original_price`, `tag_ids`.
   - Đảm bảo khi tạo/sửa món: TypeORM lưu quan hệ Many-to-Many với `m_tag` và lưu trường JSONB `options`, đồng thời xóa Redis cache `restaurant:${restaurantId}:menu`.

### 2.2. Frontend (`frontend`)
1. **Modal Quản Lý Món Ăn Cho Nhà Hàng (`MenuItemDialog`)**:
   - Thêm ô nhập **Giá gốc (VNĐ)** để hỗ trợ thiết lập ưu đãi chiết khấu.
   - Thêm **Tags Selector & Creator**: Hiển thị toàn bộ tags từ DB, cho phép gõ tên để thêm tag mới ngay lập tức.
   - Thêm **Trình Cấu Hình Tùy Chọn Món (Options & Modifiers Builder)**:
     - Tạo nhóm tùy chọn (Tên nhóm, Bắt buộc/Tùy chọn, Số lựa chọn tối thiểu/tối đa).
     - Thêm các lựa chọn trong nhóm (Tên lựa chọn, Giá cộng thêm VNĐ, Mặc định).
2. **Popup Chọn Món Cho Khách Hàng (`AddToCartDialog`) & Thẻ Món (`FoodCard`)**:
   - Lấy toàn bộ tags của món ăn trực tiếp từ DB (`item.tags`) và hiển thị huy hiệu tag sinh động.
   - Đồng bộ options và hiển thị ghi chú/lựa chọn khẩu vị chuẩn xác theo cấu hình nhà hàng đã thiết lập.
3. **Màn Hình Chi Tiết Món Ăn Của Quán (`FoodItemDetailDialog`)**:
   - Hiển thị đầy đủ tags, giá gốc, tỷ lệ giảm giá, và danh sách các nhóm tùy chọn/toppings mà quán đã thiết lập.

---

## 3. Kịch Bản Kiểm Thử 3 Nhánh (3-Branch Test Checklist)

### 3.1. Nhánh 1: Happy Path (Luồng Tiêu Chuẩn)
- [x] **TC-TAG-01**: Seed dữ liệu mới chạy thành công, 100% món ăn mẫu đều có tags và options được liên kết trong database.
- [x] **TC-TAG-02**: Khách hàng mở trang chi tiết quán và click vào món bất kỳ, Popup `AddToCartDialog` hiển thị đầy đủ các tag được lấy từ database (`item.tags`).
- [x] **TC-TAG-03**: Chủ nhà hàng mở `/partner/restaurant`, tạo món mới kèm `original_price`, chọn tags có sẵn và tạo thêm 1 tag mới: Dữ liệu lưu thành công vào database.
- [x] **TC-TAG-04**: Chủ nhà hàng thêm nhóm tùy chọn "Chọn Size" (bắt buộc) và "Topping" (tùy chọn) trong `MenuItemDialog`: Món ăn lưu đầy đủ cấu trúc options vào database và hiển thị chính xác trên menu khách hàng.

### 3.2. Nhánh 2: Edge Cases (Tình Huống Biên & Ngoại Lệ Nhẹ)
- [x] **TC-TAG-05**: Chủ nhà hàng tạo tag mới đã tồn tại tên trong hệ thống (trùng tên không phân biệt hoa thường): Hệ thống tự động gán tag đã có, không tạo bản ghi trùng lặp.
- [x] **TC-TAG-06**: Món ăn không cấu hình options hoặc không có tags: Popup hiển thị giao diện tinh gọn, không lỗi giao diện, cho phép đặt món bình thường.
- [x] **TC-TAG-07**: Nhập `original_price` nhỏ hơn hoặc bằng `price`: Giao diện tự động cảnh báo hoặc xử lý hiển thị giá chuẩn, không hiển thị phần trăm âm.

### 3.3. Nhánh 3: Error & Rejection Flow (Luồng Chặn Lỗi & Từ Chối)
- [x] **TC-TAG-08**: Tạo nhóm options bắt buộc nhưng không thêm lựa chọn nào: Form chặn submit và yêu cầu thêm ít nhất 1 lựa chọn.
- [x] **TC-TAG-09**: Giá cộng thêm của option là số âm: Form chặn và hiển thị thông báo lỗi.
- [x] **TC-TAG-10**: Gọi API tạo tag hoặc sửa món với tài khoản không phải chủ nhà hàng: Backend từ chối với mã lỗi 403 Forbidden.

---

## 4. Cổng Kiểm Soát CI Nội Bộ (Local CI Gate)
Bắt buộc vượt qua 4 bước kiểm duyệt:
1. `npm run lint` (Frontend ESLint 0 errors/warnings & Backend OxLint 0 errors/warnings).
2. `npx tsc --noEmit` (TypeScript strict check 0 errors cả 2 bên).
3. `npm test` (Unit test Vitest 100% pass cho cả Backend và Frontend).
4. `npm run build` (Biên dịch thành công).
