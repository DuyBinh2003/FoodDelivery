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
 
---

## 5. Trợ Lý AI Gợi Ý Món Ăn Thông Minh (AI Food Recommendation Assistant)

Module Trợ lý AI (`AiAssistantModule` / `AiAssistantService`) hỗ trợ người dùng tìm kiếm và khám phá món ăn thông qua giao tiếp ngôn ngữ tự nhiên (Conversational AI).

### A. Danh Sách REST APIs
| Phương thức | Đường dẫn | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/search/ai/recommend` | Public / Customer | Phân tích prompt tự nhiên, trích xuất nhu cầu sức khỏe/ngân sách/thể loại và gợi ý món ăn phù hợp. |
| `POST` | `/search/ai/chat` | Public / Customer | Hội thoại đàm thoại nhiều lượt (Multi-turn chat) với trợ lý ảo. |

### B. Request / Response Mẫu: `POST /search/ai/recommend`
- **Request Body**:
```json
{
  "prompt": "Hôm nay tôi bị cảm sốt muốn ăn món gì nóng ấm nhiều gừng thanh nhẹ quanh quận 1 dưới 50k",
  "lat": 10.7765,
  "lng": 106.7009,
  "budget": 50000
}
```
- **Response `200 OK`**:
```json
{
  "message": "Mình hiểu bạn đang cảm thấy không khỏe. Mình đặc biệt đề xuất các món nóng hổi, thanh nhẹ, ấm bụng giúp bạn nhanh chóng hồi phục năng lượng:",
  "extractedPreferences": {
    "mood": "RECOVERY_HEALTHY",
    "category": "chao-sup",
    "maxPrice": 50000,
    "dietary": [],
    "keywords": ["chao", "sup", "am-bung", "mon-nuoc"]
  },
  "suggestedDishes": [
    {
      "dishId": "dish-001",
      "dishName": "Cháo Gà Hạt Sen Nóng Hổi",
      "restaurantId": "rest-101",
      "restaurantName": "Quán Cháo Dinh Dưỡng Cô Ba",
      "price": 45000,
      "rating": 4.8,
      "matchReason": "Phù hợp từ khóa 'chao'; Đúng nhóm món 'chao-sup'; Giá 45.000đ nằm trong ngân sách"
    }
  ],
  "source": "FALLBACK_RULE_BASED"
}
```

### C. Cơ Chế Fallback An Toàn (Graceful Degradation)
- Khi gọi LLM bên ngoài (Gemini/OpenAI) gặp sự cố mạng hoặc timeout (> 4000ms), hệ thống tự động suy thoái trong suốt sang **Rule-based Keyword Recommendation Engine** dựa trên catalog món ăn sẵn có.
- Đảm bảo API luôn phản hồi nhanh chóng (HTTP 200) với gợi ý chuẩn mực và không bao giờ gián đoạn trải nghiệm người dùng.

