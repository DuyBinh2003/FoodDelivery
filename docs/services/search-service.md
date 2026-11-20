# Kiến trúc Tìm kiếm & Lọc thông minh (Smart Search Service)

Tài liệu này mô tả chi tiết về cách hệ thống tích hợp Elasticsearch (v8) để phục vụ tính năng Tìm kiếm Thông minh (Smart Search) cho các nhà hàng và món ăn, bao gồm Dual-Indexing, Bộ xử lý tiếng Việt, Thuật toán Xếp hạng Đa tiêu chí, và Gợi ý Tìm kiếm thời gian thực.

---

## 1. Mục Tiêu Kiến Trúc
- **Dual Indexing**: Lưu trữ và tìm kiếm độc lập cả Nhà hàng (`restaurants`) và Món ăn (`menu_items`) trong Elasticsearch với độ trễ phản hồi $< 30\text{ms}$.
- **Hỗ trợ Tiếng Việt Toàn diện**: Tích hợp Custom Analyzer (`vi_analyzer`, `autocomplete_analyzer`) với token filter `asciifolding` (tìm không dấu ra có dấu), loại bỏ stopwords ẩm thực ("quán", "tiệm", "cửa hàng"), và `edge_ngram` cho tìm kiếm tiền tố.
- **Multi-Factor Geo-Relevance Ranking**: Sử dụng `function_score` kết hợp độ liên quan từ khóa (BM25), hàm suy giảm khoảng cách (`gauss` decay), và điểm đánh giá (`rating`).
- **Real-time Autocomplete Suggestions**: Cung cấp endpoint gợi ý từ khóa, món ăn và quán ăn theo thời gian thực.
- **Trải nghiệm Frontend Anti-Slop**: Loading spinner 2 tầng (`isDebouncing` + `isFetching`), AbortController chống race condition và quản lý lịch sử tìm kiếm cục bộ (LocalStorage).

---

## 2. Thiết Kế Chỉ Mục Elasticsearch (Dual-Index Mapping)

### 2.1. Cấu hình Analyzer Tiếng Việt
```json
{
  "settings": {
    "analysis": {
      "filter": {
        "vietnamese_stop": {
          "type": "stop",
          "stopwords": ["quán", "tiệm", "cửa hàng", "và", "ở"]
        },
        "edge_ngram_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20
        }
      },
      "analyzer": {
        "vi_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "vietnamese_stop"]
        },
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "edge_ngram_filter"]
        }
      }
    }
  }
}
```

### 2.2. Index `restaurants`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `keyword` | UUID định danh nhà hàng |
| `name` | `text` | Tên nhà hàng (analyzer: `vi_analyzer`, subfield: `autocomplete`) |
| `location` | `geo_point` | Tọa độ `(lat, lon)` để lọc khoảng cách và tính hàm suy giảm `gauss` |
| `rating` | `float` | Điểm đánh giá trung bình |
| `total_reviews` | `integer` | Tổng lượt đánh giá |
| `is_active` | `boolean` | Trạng thái hoạt động của quán |
| `categories` | `keyword` | Danh sách danh mục (Phở, Cơm, Trà sữa...) |
| `tags` | `keyword` | Danh sách thẻ tag |
| `suggest` | `completion` | Hỗ trợ Completion Suggester |

### 2.3. Index `menu_items`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `keyword` | UUID định danh món ăn |
| `restaurant_id` | `keyword` | UUID nhà hàng sở hữu |
| `restaurant_name` | `text` | Tên nhà hàng (analyzer: `vi_analyzer`) |
| `name` | `text` | Tên món ăn (analyzer: `vi_analyzer`, subfield: `autocomplete`) |
| `description` | `text` | Mô tả chi tiết món ăn |
| `price` | `double` | Giá niêm yết |
| `is_available` | `boolean` | Còn món / Hết món |
| `tags` | `keyword` | Tags món ăn (Món Nước, Bò, Bán Chạy...) |
| `location` | `geo_point` | Tọa độ nhà hàng (đồng bộ từ quán) |
| `rating` | `float` | Điểm đánh giá nhà hàng |

---

## 3. Danh Sách API (Search Endpoints)

### 3.1. Gợi ý Tìm kiếm Thời Gian Thực (`GET /search/suggestions`)
- **Query params**: `q` (bắt buộc, $\ge 2$ ký tự), `lat`, `lon` (tùy chọn).
- **Phản hồi**:
```json
{
  "keywords": ["Phở Biên Hòa", "Phở Gà", "Phở Bò Chín"],
  "dishes": [
    {
      "id": "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
      "name": "Phở Gà",
      "price": 50000,
      "restaurant_id": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "restaurant_name": "Phở Biên Hòa"
    }
  ],
  "restaurants": [
    {
      "id": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "name": "Phở Biên Hòa",
      "rating": 4.5,
      "distance_km": 1.2
    }
  ]
}
```

### 3.2. Tìm kiếm Thực Đơn / Món Ăn (`GET /search/menu`)
- **Query params**: `q`, `categories`, `tags`, `lat`, `lon`, `radius`, `sort_by`.
- **Cơ chế**: Truy vấn trực tiếp index `menu_items` trong Elasticsearch. Tự động nhóm các món ăn theo từng nhà hàng và trả về danh sách `MenuSectionResult[]`. Fallback an toàn sang `SearchReadRepository` nếu index món chưa được tải.

### 3.3. Tìm kiếm Nhà Hàng (`GET /search/restaurants`)
- **Query params**: `q`, `categories`, `tags`, `rating`, `freeship`, `open_only`, `sort_by` (`relevance` | `distance` | `rating`), `lat`, `lon`, `radius`.
- **Cơ chế**: Query DSL `function_score` kết hợp:
  - `multi_match` trên `name^3`, `name.autocomplete^2`, `categories^2`, `tags`.
  - `geo_distance` filter theo bán kính người dùng.
  - `gauss` decay trên `location` (bán kính 3km, decay 0.5, weight 2.0).
  - `field_value_factor` trên `rating` (sqrt modifier, weight 1.5).

### 3.4. Kích hoạt Đồng bộ Thủ công (`POST /search/sync`)
- Đồng bộ toàn bộ nhà hàng và menu items từ `restaurant-service` sang 2 index Elasticsearch.
