# Kiến trúc Tìm kiếm & Lọc thông minh (Smart Search)

Tài liệu này mô tả chi tiết về cách hệ thống tích hợp Elasticsearch để phục vụ tính năng Tìm kiếm và Lọc (Smart Search) các nhà hàng và món ăn.

## 1. Mục tiêu kiến trúc
- Cung cấp khả năng tìm kiếm Full-text search tốc độ cao, hỗ trợ tiếng Việt.
- Cho phép truy vấn dựa trên tọa độ không gian (Geo-search) để tìm nhà hàng trong một bán kính cụ thể.
- Filter linh hoạt nhiều chiều dữ liệu: đánh giá, khuyến mãi freeship, phân loại quán ăn, và tags món ăn.
- Giảm tải cho database chính (PostgreSQL) khỏi các truy vấn JOIN và `LIKE` phức tạp.

## 2. Thiết kế Dữ liệu

### 2.1 Tại PostgreSQL (Nguồn sự thật - Single Source of Truth)
Cấu trúc các bảng liên quan trong `schema_restaurant` sẽ được tách biệt rõ ràng giữa Master data và Transaction/Promotion:

1. **`m_restaurant`**: Chứa thông tin gốc của nhà hàng. Bổ sung thêm các cột `lat`, `lon` (tọa độ không gian kiểu `numeric`) và `rating`.
2. **`m_category`**: Phân loại nhà hàng (Ví dụ: Trà sữa, Cơm tấm, Ăn vặt).
3. **`m_restaurant_category`**: Bảng trung gian n-n nối nhà hàng và category.
4. **`m_tag`**: Thẻ đánh dấu món ăn để dễ tìm kiếm (Ví dụ: Bestseller, Món nước, Ăn chay).
5. **`m_menu_item_tag`**: Bảng trung gian n-n nối món ăn và tag.
6. **`m_config`**: Bảng cấu hình hệ thống (Admin Level) để lưu các tham số dùng chung (ví dụ: `freeship_distance_threshold` = 2km).
7. **Freeship (Transaction Level)**: Freeship KHÔNG nằm cứng ở bảng `m_restaurant`. Việc áp dụng Freeship được đánh giá linh hoạt dựa trên vị trí hiện tại của user so với nhà hàng (nằm trong phạm vi `freeship_distance_threshold`) hoặc dựa vào Promotion.

### 2.2 Tại Elasticsearch (Read-Model)
Tạo index `restaurants` để gom nhóm các dữ liệu phân tán trên thành một Document duy nhất phục vụ truy vấn:
```json
{
  "id": "uuid",
  "name": "Cơm tấm sườn bì chả",
  "location": {
    "lat": 10.762622,
    "lon": 106.660172
  },
  "rating": 4.5,
  "categories": ["com-tam", "an-trua"],
  "tags": ["bestseller", "mon-man"]
}
```
*Lưu ý: Logic lọc freeship sẽ được tính toán lúc User gọi API Search, sử dụng tọa độ (lat/lon) của User đối chiếu với `freeship_distance_threshold` lấy từ `m_config`, chứ không lưu tĩnh trên Elasticsearch document.*

## 3. Chiến lược đồng bộ (Data Sync Strategy)

Sử dụng phương pháp **Application-level Sync** (Event-driven) cho MVP:
1. **Trigger**: Khi có bất kỳ sự thay đổi nào về `m_restaurant`, `m_category`, `m_tag` hoặc các chiến dịch Promotion liên quan, NestJS sẽ phát ra một sự kiện nội bộ.
2. **Processor**: Một listener trong `SearchModule` sẽ bắt sự kiện này. Nó truy vấn lại thông tin đầy đủ nhất từ PostgreSQL, tính toán field `has_freeship_promo`, và push Document lên Elasticsearch.
3. **Reconciliation (Đối soát)**: Có một CronJob chạy ngầm vào ban đêm (lúc thấp điểm) để quét đối chiếu và đồng bộ lại toàn bộ dữ liệu từ PostgreSQL sang Elasticsearch, đảm bảo tính nhất quán (Eventual Consistency) phòng trường hợp hệ thống mất events.

## 4. API Search (Frontend -> Backend)
API được thiết kế để Frontend (React Query) có thể gọi dạng GET với các query params:

```
GET /api/search/restaurants
  ?q=com tam            // Full-text search
  &lat=10.123&lon=106.1 // Geo-point center
  &radius=5km           // Bán kính tìm kiếm
  &rating=4.0           // Đánh giá tối thiểu
  &freeship=true        // Filter có khuyến mãi freeship
  &categories=uuid1     // Filter theo m_category
  &tags=uuid2           // Filter theo m_tag
```

Backend sẽ mapping các params này thành Query DSL của Elasticsearch (`bool` query kết hợp `must`, `filter`, `geo_distance`).
