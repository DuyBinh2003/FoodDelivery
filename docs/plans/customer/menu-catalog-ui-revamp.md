# 📋 Kế Hoạch Triển Khai: Remake Toàn Diện Giao Diện Trang Thực Đơn (/menu) Chuẩn Hóa Theo Ứng Dụng Hàng Đầu

`[COMPLETED]` • **Issue liên kết:** #86 • **Phân loại:** `customer` • **Ngày khởi tạo:** 2026-10-26

---

## 1. 🎯 Tổng Quan & Mục Tiêu

### 1.1. Hiện trạng Trang `/menu` Hiện Tại
- **Header & Tìm kiếm đơn điệu**: Trang chỉ có 1 thẻ `<h1>Thực đơn</h1>` kèm một dòng text xám, search bar đặt tách biệt, không có gợi ý từ khóa tìm kiếm nhanh (trending keywords), không có visual kích thích vị giác của một app ẩm thực.
- **Thanh Lọc Danh Mục & Tags thô sơ**: Danh mục cuộn ngang với icon nhỏ và nền tối đơn sơ, thiếu trạng thái số lượng món ăn và hiệu ứng active nổi bật.
- **Header Cụm Nhà Hàng (Restaurant Section) quá tối giản**: Chỉ hiển thị một dòng text `<h2>{restaurantName}</h2>`. Khách hàng không thể biết quán ở đâu, rating bao nhiêu sao, thời gian giao hàng dự kiến, và **không có nút bấm để xem toàn bộ thực đơn quán đó (`/restaurant/[id]`)**.
- **Thiếu Thanh Điều Khiển & Sắp Xếp (Sort & View Bar)**: Không có bộ sắp xếp (Giá tăng dần, Giá giảm dần, Món mới, Bán chạy) và thông tin số lượng kết quả tìm thấy.
- **Empty State thiếu tương tác**: Khi tìm kiếm không ra kết quả, chỉ hiển thị dòng chữ mộc mạc, không có nút "Xóa bộ lọc" để khách hàng quay lại trạng thái duyệt món.

### 1.2. Mục tiêu Đạt Được (Theo Chuẩn ShopeeFood / GrabFood / UberEats)
1. **Hero Header & Smart Food Search**:
   - Banner ẩm thực phong cách Dark Luxury với gradient ấm áp (`amber/orange/zinc-950`).
   - Tích hợp thanh tìm kiếm thông minh nổi bật, hỗ trợ phím xóa nhanh, icon tìm kiếm đổi màu động khi focus.
   - Thêm cụm **Trending Search Chips** ("Cơm tấm", "Trà sữa", "Bún đậu mắm tôm", "Gà rán giòn", "Cà phê muối") giúp người dùng bấm 1 chạm để lọc ngay.
2. **Modern Sticky Category Bar & Quick Filter Pills**:
   - Thanh cuộn danh mục mượt mà (smooth horizontal scroll), card danh mục bo góc với icon sống động và hiệu ứng phát sáng nhẹ (subtle glow) khi được chọn.
   - Các tag lọc nhanh (Ăn sáng, Món cay, Giảm giá, Món chay) hiển thị dạng pill badge tinh tế, kèm nút "Đặt lại bộ lọc" khi đang có bộ lọc hoạt động.
3. **Thanh Kết Quả & Bộ Sắp Xếp (Result Header & Sorter)**:
   - Hiển thị số lượng món ăn và số lượng quán tìm thấy (ví dụ: `Tìm thấy 24 món ngon từ 5 quán ăn`).
   - Dropdown sắp xếp đa tiêu chí: Phổ biến nhất, Giá thấp đến cao, Giá cao đến thấp, Ưu đãi hot.
4. **Restaurant Section Header Chuẩn Ứng Dụng Chuyên Nghiệp**:
   - Thẻ định danh quán ăn có logo/avatar, tên quán nổi bật, huy hiệu đối tác uy tín, đánh giá ⭐ (4.8), thời gian giao hàng ước tính (⚡ 20-30 phút), và nút điều hướng "Ghé quán ➔" dẫn trực tiếp đến `/restaurant/[id]`.
5. **Nâng cấp Thẻ Món Ăn (`FoodCard`)**:
   - Tối ưu hiển thị ảnh với zoom micro-animation khi hover, tag giảm giá `-25%`, tag `Món hot/Best Seller`.
   - Nút `+` thêm vào giỏ hàng nhanh hoặc mở popup tùy chọn món (`AddToCartDialog`).
6. **Polished Empty State**:
   - Trạng thái không tìm thấy món ăn có minh họa đẹp mắt, gợi ý các món phổ biến và nút "Xóa tất cả bộ lọc" đưa người dùng về danh mục mặc định.

---

## 2. 🔍 Khảo Sát Hiện Trạng Codebase

| File / Component | Hiện trạng | Hành động cần thực hiện |
| :--- | :--- | :--- |
| [`frontend/src/app/menu/page.tsx`](file:///d:/code/FoodDelivery/frontend/src/app/menu/page.tsx) | Bố cục dọc cơ bản, thiếu Hero Banner, thiếu thanh sắp xếp và thống kê kết quả. | Tái cấu trúc layout: Hero Header, Search & Filter Bar cao cấp, Sticky Category Nav, Result Toolbar, Section Nhà hàng chuẩn hóa. |
| [`frontend/src/features/search/components/SearchFilters.tsx`](file:///d:/code/FoodDelivery/frontend/src/features/search/components/SearchFilters.tsx) | Chỉ xếp chồng `SearchBar`, `CategoryFilter`, `TagFilter`. | Thiết kế lại thành cụm Filter Suite hiện đại: Hero Search + Quick Tags + Horizontal Category Carousel. |
| [`frontend/src/features/search/components/SearchBar.tsx`](file:///d:/code/FoodDelivery/frontend/src/features/search/components/SearchBar.tsx) | Input đơn giản với viền mỏng. | Nâng cấp giao diện thanh tìm kiếm bo tròn cỡ lớn, hiệu ứng backdrop-blur và phím tắt nhanh. |
| [`frontend/src/features/search/components/CategoryFilter.tsx`](file:///d:/code/FoodDelivery/frontend/src/features/search/components/CategoryFilter.tsx) | Nút vuông nhỏ với icon cơ bản. | Thiết kế lại thành dạng pill/card tương tác mượt mà, hỗ trợ nút "Tất cả" và hiệu ứng gradient khi active. |
| [`frontend/src/features/menu/components/food-list/food-list.tsx`](file:///d:/code/FoodDelivery/frontend/src/features/menu/components/food-list/food-list.tsx) | Header nhà hàng chỉ là `<h2>{restaurantName}</h2>`. | Bổ sung Header nhà hàng đầy đủ thông tin: Avatar, Rating, Cự ly/Thời gian giao, Nút "Xem quán" link sang `/restaurant/[id]`. |

---

## 3. 🛠️ Thiết Kế Chi Tiết & Wireframe Giao Diện Mới

### 3.1. Cấu Trúc Bố Cục Trang `/menu` (Page Architecture)
```text
┌────────────────────────────────────────────────────────────────────────┐
│  🍜 HERO SECTION (Dark-Room Amber Glow)                                │
│  "Hôm nay bạn muốn ăn gì?"                                             │
│  [ 🔍 Tìm kiếm món ăn, quán ăn yêu thích...              [Xóa] ]       │
│  Gợi ý nhanh: [Trà sữa] [Cơm tấm] [Bún đậu] [Gà rán] [Cà phê muối]    │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│  🏷️ CATEGORY BAR & TAGS                                                │
│  [ Tất cả ] [ 🍚 Cơm ] [ 🍜 Bún/Phở ] [ 🧋 Trà sữa ] [ 🍗 Ăn vặt ]     │
│  Tags nhanh: [⭐ Đánh giá cao] [🔥 Giảm giá] [⚡ Giao nhanh] [Xóa lọc] │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│  📊 RESULT BAR: "Tìm thấy 28 món ngon từ 6 nhà hàng" | Sắp xếp: [Giá ↓]│
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│  🏪 NHÀ HÀNG: Cơm Tấm Phúc Lộc Thọ   ⭐ 4.8 (500+) • 2.1km • ⚡ 25 phút │
│                                                [ Ghé thăm quán ➔ ]     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ 🍛 Cơm sườn  │  │ 🍲 Canh chua │  │ 🍗 Đùi gà nướng│ │ 🥤 Trà tắc   ││
│  │ 45.000đ -15% │  │ 20.000đ      │  │ 55.000đ      │  │ 15.000đ      ││
│  │ [ + Thêm ]   │  │ [ + Thêm ]   │  │ [ + Thêm ]   │  │ [ + Thêm ]   ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 🧪 Kịch Bản Kiểm Thử 3 Nhánh (Testing Policy Compliance)

Toàn bộ kịch bản tuân thủ `testing-policy` có Traceability Header:

### 4.1. Nhánh 1: Happy Path (Dòng Chảy Chuẩn)
- **Kịch bản**: Khách hàng mở `/menu`, gõ từ khóa "cơm", bấm chọn danh mục "Cơm", chọn sắp xếp "Giá thấp đến cao".
- **Kỳ vọng**: 
  - URL cập nhật mượt mà `?q=cơm&category=...&sort=price_asc` không reload trang.
  - Danh sách hiển thị các quán có món cơm với thẻ nhà hàng đầy đủ thông tin (avatar, sao, thời gian giao).
  - Bấm nút "Ghé thăm quán" chuyển hướng chính xác đến `/restaurant/[id]`.

### 4.2. Nhánh 2: Edge Cases (Biên & Giới Hạn)
- **Kịch bản 1 (Tên nhà hàng hoặc món quá dài)**: Tên món dài 80 ký tự, tên nhà hàng dài 60 ký tự trên màn hình điện thoại (375px).
- **Kỳ vọng**: Text tự động truncate có dấu `...`, không bị vỡ layout, không tràn viền ngang (no horizontal overflow).
- **Kịch bản 2 (Quán đang đóng cửa hoặc món hết hàng)**: Món có `is_available: false` hoặc quán ngoài giờ mở cửa.
- **Kỳ vọng**: Thẻ món hiển thị overlay xám mờ "Hết hàng", nút thêm bị vô hiệu hóa an toàn, không cho phép click.

### 4.3. Nhánh 3: Error & Rejection Flow (Ngoại Lệ & Khắc Phục)
- **Kịch bản**: Tìm kiếm từ khóa không tồn tại "xyz123456789".
- **Kỳ vọng**: Hiển thị Empty State chuyên nghiệp với thông báo thân thiện và nút "Xóa bộ lọc". Khi bấm nút "Xóa bộ lọc", toàn bộ params URL được dọn sạch và trang tự động hiển thị lại menu đầy đủ.

---

## 5. ✅ Checklist Tiêu Chuẩn Cần Vượt Qua (Local CI Gate)

- [ ] **Linter**: `npm run lint` (Frontend: eslint 0 warnings, 0 errors).
- [ ] **Type Check**: `npx tsc --noEmit` (0 errors, nghiêm cấm `any`).
- [ ] **Unit Tests (Vitest)**:
  - [ ] `frontend/src/features/menu/components/food-list/tests/food-list.spec.tsx` pass 100%.
  - [ ] `frontend/src/features/search/components/tests/search-filters.spec.tsx` pass 100%.
- [ ] **Build Check**: `npm run build` thành công trên Next.js frontend.
- [ ] **Aesthetics & Anti-slop**: Đạt chuẩn thiết kế Taste Skill, font rõ ràng, phối màu amber/orange/dark cao cấp, responsive hoàn hảo trên Mobile, Tablet, Desktop.
