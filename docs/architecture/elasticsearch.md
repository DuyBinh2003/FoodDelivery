# Kiến trúc Elasticsearch trong FoodDelivery

Tài liệu này mô tả cách hệ thống FoodDelivery tích hợp và sử dụng Elasticsearch để tối ưu hóa việc tìm kiếm nhà hàng dựa trên vị trí địa lý (geo-location), từ khóa (fuzzy search) và các bộ lọc khác.

## 1. Tổng quan Kiến trúc (Overview)

Hệ thống sử dụng **Elasticsearch (v8)** làm công cụ tìm kiếm chính cho các thao tác truy vấn nhà hàng phức tạp nhằm giảm tải cho PostgreSQL. 
Mô hình kết hợp:
- **PostgreSQL**: Lưu trữ nguồn dữ liệu gốc (Master Data).
- **Elasticsearch**: Đóng vai trò là Read-Model (hoặc Search Index) để query tốc độ cao.
- **Đồng bộ dữ liệu (Data Sync)**: Sử dụng mô hình Event-driven nội bộ thông qua TypeORM Subscriber.

## 2. Cấu trúc Index

Hệ thống lưu trữ dữ liệu vào index có tên `restaurants` với Mapping (định nghĩa trong `ElasticsearchRepository`) như sau:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `keyword` | Khóa chính của nhà hàng (UUID từ DB) |
| `name` | `text` | Tên nhà hàng, dùng analyzer `standard` hỗ trợ tìm kiếm full-text và fuzzy |
| `location` | `geo_point` | Tọa độ (vĩ độ, kinh độ) dùng để lọc theo khoảng cách (`geo_distance`) |
| `rating` | `float` | Điểm đánh giá nhà hàng |
| `categories` | `keyword` | Mảng các category ID hoặc Name |
| `tags` | `keyword` | Mảng các tag ID hoặc Name |

## 3. Luồng Ghi và Đồng bộ dữ liệu (Write Flow)

Mọi thao tác thay đổi dữ liệu của nhà hàng đều được PostgreSQL đóng vai trò Source of Truth. Dữ liệu sau đó sẽ tự động lan truyền (sync) sang Elasticsearch.

**Sơ đồ luồng Ghi:**
`PostgreSQL (m_restaurant)` ➔ `TypeORM Event (Insert/Update/Remove)` ➔ `RestaurantSubscriber` ➔ `SyncRestaurantIndexUseCase` ➔ `ElasticsearchRepository` ➔ `Elasticsearch`

**Chi tiết tiến trình:**
1. Khi có thao tác Create/Update/Delete trên Entity `Restaurant`, TypeORM kích hoạt event subscriber `RestaurantSubscriber`.
2. `RestaurantSubscriber` bắt event (`afterInsert`, `afterUpdate`, `afterRemove`). 
   - Với Update: Nó sẽ query lại full dữ liệu của nhà hàng (bao gồm relation như `categories`) để đảm bảo data được đẩy sang ES là mới nhất.
3. Chuyển giao dữ liệu cho `SyncRestaurantIndexUseCase` để format và chuyển tiếp.
4. `ElasticsearchRepository` gọi Elasticsearch Client (v8) thực thi thao tác `index` (upsert) hoặc `delete`.

## 4. Luồng Đọc dữ liệu (Read Flow)

Có 2 kịch bản (Use Cases) chính sử dụng Elasticsearch:

### 4.1. Tìm kiếm Nhà hàng (`/api/search/restaurants`)
Tìm kiếm các nhà hàng phù hợp với các tiêu chí bộ lọc (location, từ khóa, rating, categories, v.v.).

**Luồng hoạt động:**
`Client` ➔ `SearchController` ➔ `SearchRestaurantsUseCase` ➔ `ElasticsearchRepository` ➔ `Elasticsearch`

**Chi tiết Query:**
- Gửi một truy vấn dạng `bool` query.
- `must`: Thực hiện `match` query trên field `name` với tùy chọn `fuzziness: 'AUTO'` (nếu có tham số `q`).
- `filter`: 
  - Lọc `range` đối với `rating`.
  - Lọc `terms` đối với `categories` và `tags`.
  - Lọc `geo_distance` đối với `location` (Giới hạn bán kính hiển thị, mặc định 10km quanh user).
- `sort`: Sắp xếp tăng dần theo khoảng cách `_geo_distance` tính từ vị trí user.

### 4.2. Tìm kiếm Menu/Món ăn (`/api/search/menu`)
Vì món ăn thay đổi rất thường xuyên về trạng thái (`is_available`, giá cả), hệ thống áp dụng chiến lược kết hợp giữa Elasticsearch và PostgreSQL.

**Luồng hoạt động:**
1. **Bước 1 (ES)**: Gọi `SearchRestaurantsUseCase` truyền các bộ lọc vào Elasticsearch để lấy danh sách các **nhà hàng phù hợp** ở khu vực gần đó.
2. **Bước 2 (PG)**: Trích xuất mảng `restaurant_id` từ kết quả của ES. Chuyển cho `SearchReadRepository` để query danh sách món ăn từ PostgreSQL (`m_menu_item`) giới hạn trong danh sách nhà hàng đó (`WHERE restaurant_id IN (...)`).
3. **Bước 3 (Map)**: Map các menu item vào đúng nhà hàng và trả về kết quả cho Client.

## 5. Ưu và Nhược điểm của Thiết kế hiện tại

**Ưu điểm:**
- Tối ưu hóa cực tốt cho tính năng tìm kiếm vị trí (geo-spatial query) và fuzzy matching, điều mà PostgreSQL xử lý tốn kém hơn nhiều.
- Giữ logic đồng bộ gần với Data Layer nhờ dùng TypeORM Subscriber, dễ triển khai.

**Điểm cần lưu ý / Tối ưu sau này:**
- Subscriber đồng bộ hiện tại chạy đồng bộ (await sync trong event TypeORM) -> Có thể làm tăng thời gian phản hồi API Write. Cân nhắc đổi sang dùng Message Queue (như SQS/RabbitMQ) hoặc CDC (như Debezium) nếu hệ thống phình to.
- Tính năng Search Menu phải JOIN/Query lại Postgres ở bước 2, tốt cho tính nhất quán của Menu nhưng nếu số lượng nhà hàng match quá lớn, query `IN (...)` có thể gây tắc nghẽn. Có thể tính đến việc index cả món ăn vào Elasticsearch dưới dạng Nested object hoặc index riêng biệt.
