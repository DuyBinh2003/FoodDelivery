# Kế hoạch Triển khai: Refactor Giao diện Frontend theo Chuẩn Taste Skill (Anti-Slop Art Direction)

> **Mã công việc:** `frontend-design-taste-refactor`  
> **Trạng thái:** `[COMPLETED]`  
> **Người thực hiện:** Orchestrator, Planner, Coder, Reviewer  
> **Ngày tạo:** 2026-10-23  
> **Ngày hoàn thành:** 2026-10-23  
> **Khu vực tác động:** `frontend/src/`  
> **Kỹ năng áp dụng:** `.agents/skills/design-taste-frontend`, `.agents/skills/ui-ux-pro-max`, `.agents/skills/nextjs-patterns`

---

## 1. Bối cảnh & Mục tiêu (Context & Objective)

### 1.1. Bối cảnh
Giao diện Frontend hiện tại của dự án FoodDelivery có nền tảng cấu trúc tốt (Next.js 16 App Router, TailwindCSS v4, Base UI), tuy nhiên phong cách hiển thị còn mang nhiều đặc điểm chung chung (generic AI templates: nhiều viền gradient lặp lại, các ô icon màu mè thiếu chiều sâu, bảng màu chưa đậm chất nghệ thuật ẩm thực cao cấp).

### 1.2. Mục tiêu Refactor
Nâng tầm toàn diện giao diện Frontend lên cấp độ **Award-Winning / Anti-Slop** theo triết lý của skill `design-taste-frontend`:
- **Loại bỏ triệt để AI Slop Tells:** Bỏ các headline căn giữa 3 dòng rập khuôn, các icon nằm trong ô tròn/vuông màu gradient nhạt nhòa, viền mỏng xám vô nghĩa, và các con số giả (lorem numbers).
- **Art Direction đậm chất Ẩm thực Hiện đại (`dark-room` + warm editorial tone):** Sử dụng nền tối ấm áp sang trọng (deep obsidian / warm carbon `#090a0c`), màu điểm nhấn cam đất nướng / terracotta nồng ấm (`#f97316` -> `#ea580c` với oklch), tương phản typography sắc nét với tỉ lệ bước nhảy rõ ràng.
- **Phân định rạch ròi Page vs App Screen:**
  - **Page** (Landing page, trang thực đơn, chi tiết món ăn): Bố cục giàu nhịp điệu thị giác, typography tiêu đề lớn, hình ảnh món ăn thực tế tỉ lệ chuẩn, khoảng thở thoáng đãng.
  - **App Screen** (Admin portal, Driver portal, Dashboard): Tuân thủ nghiêm ngặt `references/app-screens.md`: 1px quiet borders, panel thẻ phẳng không đổ bóng dày cộp, KPI thuần số liệu rõ ràng không icon vòng tròn, bảng dữ liệu căn lề số chuẩn xác.

---

## 2. Nguyên tắc Bất biến (Core Invariants)

1. **Giữ nguyên 100% Business Logic:**
   - Tuyệt đối không thay đổi Zustand store (`useAuthStore`, `useCartStore`, `useLocationStore`), React Query hooks, API fetchers (`@/lib/api-client`, `order-api`, `restaurant-api`, v.v.).
   - Giữ nguyên URL routing, query parameters, các callback handlers (`onClick`, `onSubmit`, `onChange`).
   - Giữ nguyên props interface của components (chỉ mở rộng hoặc tinh chỉnh class/variant styling).
2. **Không làm gãy CI Gate:**
   - Mỗi batch phải đảm bảo: `npm run lint` (0 error/warning), `npx tsc --noEmit` (0 error), `npm test` (100% pass 95/95 tests).
3. **Thực thi tuần tự theo Batch (3-5 files mỗi batch):**
   - Không nhảy cóc, báo cáo rõ ràng sau từng batch.

---

## 3. Danh sách File Refactor & Phân kỳ Thực hiện (Batching Plan)

### 🟢 Giai đoạn 1: Global Styles & Theme Config (2 files) - [HOÀN THÀNH]
*Trọng tâm: Thiết lập nền tảng design tokens, typography scale, palette màu ẩm thực sang trọng, thanh cuộn và layout shell.*
1. `frontend/src/app/globals.css`: Định nghĩa design tokens màu sắc (oklch, warm neutrals, terracotta primary), font scale, animation utilities tinh gọn, loại bỏ các biến thừa.
2. `frontend/src/app/layout.tsx`: Tối ưu font hierarchy, root background, toast styling đồng bộ bảng màu mới.

---

### 🟢 Giai đoạn 2: Base / Atomic UI Components (6 files) - [HOÀN THÀNH]
*Trọng tâm: Chuẩn hóa các thành phần nền tảng, trạng thái tương tác vi mô (hover, active, focus-visible, disabled, loading).*
1. `frontend/src/components/ui/button.tsx`: Cập nhật button variants (primary terracotta ấm, secondary neutral, ghost, outline mờ tinh tế, kích thước và padding chuẩn tỉ lệ).
2. `frontend/src/components/ui/badge.tsx`: Trạng thái status pill tinh gọn, màu data-driven, không dùng bóng đổ thừa.
3. `frontend/src/components/ui/card.tsx`: Surface phẳng với 1px quiet border, tone step tự nhiên, loại bỏ drop-shadow nặng nề.
4. `frontend/src/components/ui/input.tsx`: Ô nhập liệu thanh thoát, focus ring sắc sảo, trạng thái invalid rõ ràng.
5. `frontend/src/components/ui/label.tsx`: Typography nhãn tinh tế, tracking nhẹ.
6. `frontend/src/components/ui/error-state/error-state.tsx`: Giao diện trạng thái rỗng / lỗi đẹp mắt, CTA rõ ràng.

---

### 🟢 Giai đoạn 3: Layout & Composite Components (4 files) - [HOÀN THÀNH]
*Trọng tâm: Thanh điều hướng trang nhã, dropdown menu, thanh điều hướng đáy trên di động.*
1. `frontend/src/components/layout/Navbar.tsx`: Tối ưu thanh điều hướng, logo nhận diện, active pill tối giản, giỏ hàng floating indicator.
2. `frontend/src/features/home/components/bottom-navigation-bar.tsx`: Thanh điều hướng mobile gọn gàng, icon + label tinh tế.
3. `frontend/src/features/home/components/home-header.tsx`: Thanh tìm kiếm món ăn và địa chỉ giao hàng phong cách editorial hiện đại.
4. `frontend/src/features/home/components/notification-drawer.tsx`: Drawer thông báo phẳng, danh sách thông báo mạch lạc.

---

### 🟢 Giai đoạn 4: Các Pages & Feature Components (Chia 4 Batches) - [HOÀN THÀNH]

#### 🔹 Batch 4.1: Customer Feed & Home Experience (5 files) - [HOÀN THÀNH]
1. `frontend/src/features/home/components/restaurant-card.tsx`: Thẻ nhà hàng tỉ lệ ảnh 16:10 sắc nét, badge đánh giá và thời gian giao hàng tối giản.
2. `frontend/src/features/home/components/category-grid.tsx`: Lưới danh mục ẩm thực thanh thoát, typography chọn lọc, bỏ ô màu gradient sáo rỗng.
3. `frontend/src/features/home/components/banner-carousel.tsx`: Hero visual/banner cuốn hút với layout bất đối xứng có chủ đích.
4. `frontend/src/features/home/components/home-skeletons.tsx`: Shimmer loading mượt mà khớp chính xác với bố cục mới.
5. `frontend/src/app/page.tsx`: Căn chỉnh khoảng cách sections, nhịp điệu trang chủ tự nhiên.

#### 🔹 Batch 4.2: Restaurant Detail & Menu Experience (5 files) - [HOÀN THÀNH]
1. `frontend/src/features/restaurant/components/restaurant-header/restaurant-header.tsx`: Header nhà hàng sang trọng, thông tin cô đọng.
2. `frontend/src/features/restaurant/components/restaurant-client/restaurant-client.tsx`: Tabs phân loại món ăn và menu grid sắc nét.
3. `frontend/src/features/restaurant/components/floating-bottom-cart/floating-bottom-cart.tsx`: Bar giỏ hàng nổi bật, số lượng món và tổng tiền rõ nét.
4. `frontend/src/features/restaurant/components/add-to-cart-dialog/add-to-cart-dialog.tsx`: Dialog chọn size/topping trực quan, giá tiền cập nhật real-time.
5. `frontend/src/app/menu/page.tsx`: Trang khám phá thực đơn đa dạng với bộ lọc tối giản.

#### 🔹 Batch 4.3: Order Flow & Tracking (5 files) - [HOÀN THÀNH]
1. `frontend/src/features/orders/components/order-stepper.tsx`: Stepper trạng thái đơn hàng thanh mảnh, trực quan.
2. `frontend/src/features/orders/components/OrderReviewModal.tsx`: Modal đánh giá đơn hàng sạch sẽ, vùng tải ảnh trực quan.
3. `frontend/src/features/orders/components/OrderHistoryList.tsx`: Lịch sử đơn hàng dạng danh sách thẻ phẳng gọn gàng.
4. `frontend/src/app/orders/[id]/page.tsx`: Trang chi tiết theo dõi đơn hàng và bản đồ.
5. `frontend/src/app/checkout/page.tsx`: Trang thanh toán tinh gọn, nhóm thông tin rõ ràng.

#### 🔹 Batch 4.4: App Screens (Driver & Admin Portals) (4 files) - [HOÀN THÀNH]
*Tuân thủ 100% `references/app-screens.md`:*
1. `frontend/src/app/(admin)/admin/dashboard/page.tsx`: Admin dashboard với KPI thuần số liệu, bảng dữ liệu kẻ rule tinh gọn.
2. `frontend/src/app/(admin)/admin/layout.tsx`: Layout sidebar tối giản, quiet borders, avatar sắc sảo.
3. `frontend/src/features/driver/components/driver-dashboard/driver-dashboard.tsx`: Driver portal tối ưu cho công việc giao hàng, tab chuyển đổi rõ ràng.
4. `frontend/src/app/history/page.tsx`: Trang tổng hợp lịch sử giao dịch/đơn hàng.

---

## 4. Kịch bản Kiểm thử & Bảo đảm Chất lượng (3 Nhánh)

### 🟢 Happy Path
- **HP-01:** Tất cả các trang hiển thị đúng bảng màu mới, phông chữ đồng bộ, không bị vỡ layout ở các breakpoint (Mobile: 375px/390px, Tablet: 768px, Desktop: 1280px/1440px).
- **HP-02:** Toàn bộ tương tác: Đăng nhập, Chọn món, Thêm giỏ hàng, Mở modal tùy chọn, Đặt hàng, Xem tracking hoạt động bình thường, không suy giảm tốc độ phản hồi.

### 🟡 Edge Cases
- **EC-01:** Món ăn không có ảnh hoặc link ảnh lỗi: Hiển thị placeholder tinh tế, không làm lệch chiều cao hàng trong grid.
- **EC-02:** Tên món ăn hoặc địa chỉ cực dài: Tự động `truncate` hoặc xuống dòng an toàn không làm tràn container (`overflow-hidden`).
- **EC-03:** Màn hình thu nhỏ hoặc phóng to (Zoom 125%, 150%): Các panel và navigation không bị đè khuất nội dung.

### 🔴 Error / Regression Flow
- **ER-01:** `npm run lint` đạt 0 error, 0 warning.
- **ER-02:** `npx tsc --noEmit` đạt 0 lỗi biên dịch TypeScript.
- **ER-03:** `npm test` giữ vững 95/95 test cases pass 100%.

---

## 5. Kết quả Nghiệm thu & Bộ Tứ Kiểm Soát CI Nội Bộ (Local CI Gate)

| Hạng mục kiểm soát | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :--- | :--- |
| **1. Linter** | `npm run lint` | **100% PASS** | 0 errors, 0 warnings (ESLint) |
| **2. Type Check** | `npx tsc --noEmit` | **100% PASS** | 0 compilation errors |
| **3. Unit Tests** | `npm test` | **100% PASS** | 95/95 test cases passed (32 suites) |
| **4. Build Check** | `npm run build` | **100% PASS** | Biên dịch thành công 26 static & dynamic routes |

*Kế hoạch refactor toàn diện giao diện Frontend theo tiêu chuẩn Anti-Slop Art Direction đã hoàn thành trọn vẹn và sẵn sàng bàn giao.*
