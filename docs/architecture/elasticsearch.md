# Kiến trúc Elasticsearch trong FoodDelivery

Tài liệu này mô tả cách hệ thống FoodDelivery tích hợp và sử dụng **Elasticsearch (v8)** làm công cụ tìm kiếm và lọc thông minh (Smart Search Engine) cho nhà hàng và món ăn, kết hợp vị trí không gian (Geo-spatial query), xử lý ngôn ngữ tiếng Việt (Vietnamese Analyzer), thuật toán xếp hạng đa tiêu chí (Relevance Ranking), và gợi ý tự động (Completion Suggesters).

---

## 1. Tổng quan Kiến trúc (Overview)

Hệ thống áp dụng mô hình tách biệt CQRS (Command Query Responsibility Segregation):
- **Command Path (Đường Ghi)**: PostgreSQL (`schema_restaurant`) đóng vai trò Single Source of Truth, lưu trữ Master Data nhà hàng và menu.
- **Query Path (Đường Đọc)**: Elasticsearch (v8) đóng vai trò Read-Model hiệu năng cao, phẳng hóa dữ liệu nhà hàng và món ăn để phục vụ các truy vấn phức tạp với độ trễ $< 30\text{ms}$.
- **Data Ingestion**: Đồng bộ bất đồng bộ từ `restaurant-service` sang Elasticsearch thông qua `ElasticsearchRepository.syncAllRestaurants()`, kết hợp background reconciliation khi khởi động.

---

## 2. Cấu trúc Chỉ mục (Dual Index Architecture)

Hệ thống quản lý 2 index riêng biệt:

### 2.1. Cấu hình Analyzer Tiếng Việt (`vi_analyzer` & `autocomplete_analyzer`)
Cả 2 index đều được áp dụng bộ analyzer tùy biến:
- `vietnamese_stop`: Loại bỏ các từ tiền tố hoặc từ nối dư thừa trong ẩm thực ("quán", "tiệm", "cửa hàng", "và", "ở").
- `edge_ngram_filter`: Sinh các token tiền tố độ dài từ 2 đến 20 ký tự để phục vụ tìm kiếm nhanh khi đang gõ phím.
- `asciifolding`: Tự động loại bỏ dấu tiếng Việt ("phở bò" $\leftrightarrow$ "pho bo", "trà sữa" $\leftrightarrow$ "tra sua").

### 2.2. Index `restaurants`
Lưu trữ thông tin nhà hàng phục vụ tìm kiếm quán và tính khoảng cách:
```json
{
  "properties": {
    "id": { "type": "keyword" },
    "name": {
      "type": "text",
      "analyzer": "vi_analyzer",
      "fields": {
        "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer" },
        "keyword": { "type": "keyword" }
      }
    },
    "location": { "type": "geo_point" },
    "rating": { "type": "float" },
    "total_reviews": { "type": "integer" },
    "is_active": { "type": "boolean" },
    "categories": { "type": "keyword" },
    "tags": { "type": "keyword" },
    "suggest": { "type": "completion" }
  }
}
```

### 2.3. Index `menu_items`
Lưu trữ toàn bộ món ăn độc lập, giải quyết triệt để bài toán tìm món ăn khi tên quán không trùng tên món:
```json
{
  "properties": {
    "id": { "type": "keyword" },
    "restaurant_id": { "type": "keyword" },
    "restaurant_name": { "type": "text", "analyzer": "vi_analyzer" },
    "name": {
      "type": "text",
      "analyzer": "vi_analyzer",
      "fields": {
        "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer" },
        "keyword": { "type": "keyword" }
      }
    },
    "description": { "type": "text", "analyzer": "vi_analyzer" },
    "price": { "type": "double" },
    "is_available": { "type": "boolean" },
    "tags": { "type": "keyword" },
    "location": { "type": "geo_point" },
    "rating": { "type": "float" },
    "suggest": { "type": "completion" }
  }
}
```

---

## 3. Thuật Toán Xếp Hạng Đa Tiêu Chí (Multi-Factor Geo-Relevance Ranking)

Khi người dùng tìm kiếm (`GET /api/search/restaurants`), hệ thống áp dụng `function_score` Query DSL:

$$\text{FinalScore} = \text{TextRelevance (BM25)} \times \text{DistanceDecay (Gauss)} \times \text{RatingFactor (Sqrt)}$$

1. **Text Relevance (BM25)**:
   - Khớp trường `name^3`, `name.autocomplete^2`, `categories^2`, `tags` với `fuzziness: 'AUTO'`.
2. **Hàm suy giảm khoảng cách (`gauss` decay)**:
   - Điểm suy giảm dần theo khoảng cách từ vị trí người dùng (`origin: {lat, lon}`, `scale: 3km`, `decay: 0.5`, `weight: 2.0`). Quán càng gần điểm càng cao, nhưng quán ở xa có rating xuất sắc vẫn có cơ hội xuất hiện ở thứ hạng tốt.
3. **Trọng số Đánh giá (`field_value_factor`)**:
   - Nhân với điểm `rating` có modifier `sqrt` (`missing: 3.0`, `weight: 1.5`), ưu tiên các quán có chất lượng dịch vụ được đánh giá cao.

---

## 4. Gợi Ý Tự Động (Autocomplete Suggesters & Keystroke Pipeline)

Endpoint `GET /api/search/suggestions?q=...` xử lý song song trên 2 index:
1. Tìm nhà hàng khớp tiền tố trong `restaurants`.
2. Tìm món ăn khớp tiền tố trong `menu_items`.
3. Trả về payload gồm: `keywords`, `dishes` (kèm giá và tên quán), `restaurants` (kèm cự ly km và rating).
4. Phía Frontend tích hợp cơ chế Loading 2 tầng (`isDebouncing` + `isFetching`) và `AbortController` tự động hủy request cũ khi người dùng gõ phím liên tục, tránh giật lag và race condition.
