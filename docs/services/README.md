# ⚙️ Microservices & API Specifications

Thư mục này lưu trữ đặc tả chi tiết (Technical Specifications) của từng microservice trong hệ thống **Food Delivery**. Mỗi tài liệu trình bày mục đích nghiệp vụ, danh sách RESTful API, Database Schema, các endpoint nội bộ (Internal APIs) và tương tác sự kiện (SNS/SQS).

---

## 📊 Ma Trận Tổng Quan Các Dịch Vụ (Services Matrix)

| Service | Port | Database Schema | Trách nhiệm chính | Giao tiếp nổi bật | Chi tiết |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **User Service** | `3001` | `schema_user` | Xác thực (Auth), Quản lý người dùng, Hồ sơ tài xế & nhà hàng, Tiếp nhận đơn đăng ký. | Pub: `RegistrationCreated` qua SNS | [`user-service.md`](./user-service.md) |
| **Admin Service** | `3002` | `public` | Xét duyệt hồ sơ đối tác, Cấu hình hệ thống, Thống kê, Bảng điều khiển quản trị. | Sub: SQS Registration Queue, WebSocket Admin | [`admin-service.md`](./admin-service.md) |
| **Restaurant Service** | `3003` | `schema_restaurant` | Quản lý thông tin quán ăn, Menu món ăn, Danh mục (`m_category`), Tags, Bật/tắt mở quán. | Cung cấp Internal API kiểm tra trạng thái quán | [`restaurant-service.md`](./restaurant-service.md) |
| **Order Service** | `3004` | `schema_order` | Quản lý vòng đời đơn hàng (State Machine), kiểm tra giỏ hàng, cuốc xe tài xế, đánh giá đơn. | Pub: `OrderCreated` qua SQS; Cung cấp Internal Metrics cho Admin | [`order-service.md`](./order-service.md) |
| **Driver Service** | `3005` | `schema_driver` | Quản lý trạng thái trực tuyến/ngoại tuyến, Định vị GPS (Redis GEO), Phân phối cuốc xe. | Redis Geospatial, SQS Driver Queue | [`driver-service.md`](./driver-service.md) |
| **Search Service** | `3006` | *Elasticsearch Index* | Tìm kiếm mờ (Fuzzy search) món ăn, nhà hàng, gợi ý tự động (Autocomplete), lọc bán kính. | Đồng bộ dữ liệu định kỳ từ DB sang Elasticsearch | [`search-service.md`](./search-service.md) |
| **Payment Service** | `3007` | `schema_payment` | Sổ cái kế toán kép (Double-entry), Quản lý ví 4 chủ thể, Xử lý COD & hạn mức thấu chi tài xế. | Append-Only Ledger, Bi quan khóa `SELECT FOR UPDATE` | [`payment-service.md`](./payment-service.md) |

---

## 🔒 Quy Ước Bảo Mật & Xác Thực Giữa Các Service

1. **Client-Facing APIs (Công khai hoặc người dùng cuối):**
   - Định tuyến qua NGINX Gateway tại `http://localhost:3000/api/v1/<service>/*`.
   - Xác thực người dùng bằng JSON Web Token (JWT) thông qua `JwtAuthGuard` tại từng service.
2. **Internal APIs (Chỉ dành cho giao tiếp nội bộ giữa các microservices):**
   - Đặt tiền tố URL dạng: `/internal/<resource>/*`.
   - **Tuyệt đối không public** qua NGINX API Gateway. Chỉ có thể truy cập trong mạng nội bộ Docker (`FoodDelivery_internal-network`).
   - Dùng để xác thực tính sẵn sàng của nhà hàng, đồng bộ trạng thái duyệt hồ sơ, và kiểm tra số dư ví.

---

## 📝 Danh Sách Tài Liệu Từng Service

- 👤 [User Service (`user-service.md`)](./user-service.md)
- 👑 [Admin Service (`admin-service.md`)](./admin-service.md)
- 🏪 [Restaurant Service (`restaurant-service.md`)](./restaurant-service.md)
- 🛒 [Order Service (`order-service.md`)](./order-service.md)
- 🛵 [Driver Service (`driver-service.md`)](./driver-service.md)
- 🔍 [Search Service (`search-service.md`)](./search-service.md)
- 💳 [Payment Service (`payment-service.md`)](./payment-service.md)
