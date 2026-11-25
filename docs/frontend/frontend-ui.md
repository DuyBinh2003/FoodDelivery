# Frontend UI & Design System (v2.0 — Fresh Green)

Tài liệu mô tả kiến trúc giao diện người dùng (UI/UX), Design System và các trang đã triển khai trên Frontend Next.js 16 (App Router).

---

## 1. Design System & Foundation (`src/app/globals.css`, `src/app/layout.tsx`)

- **Bảng màu chủ đạo:** **Fresh Green** (`oklch(0.55 0.18 145)` ở Light Mode / `oklch(0.64 0.19 145)` ở Dark Mode).
- **Theme Mode:** **Light Mode mặc định**, hỗ trợ chuyển đổi **Dark Mode** tức thì qua `ThemeProvider` và nút toggle trên `Navbar` (lưu `localStorage` khóa `fd-theme-mode`).
- **Typography (Self-hosted via `@fontsource/*`):**
  - Display / Heading: `Nunito` (`600`–`900`)
  - Body / UI: `Inter` (`400`–`700`)
  - Tabular Numbers / Codes: `JetBrains Mono` (`400`, `500`, `700`)
- **Đa ngôn ngữ (i18n):** `next-intl` kết hợp `LocaleProvider` hỗ trợ tiếng Việt (`vi`, mặc định) và tiếng Anh (`en`) thông qua từ điển `frontend/messages/vi.json` & `en.json`, chuyển đổi trực tiếp trên `Navbar`.
- **Chuyển động (Animation):** `framer-motion` bọc trong `<MotionConfig reducedMotion="user">` (`MotionProvider`), cung cấp `PageTransition`, `MotionList` / `MotionListItem`, parallax cuộn trang trên Hero và tab/pill transitions.
- **UI Primitives tái sử dụng:**
  - `src/components/ui/status-badge/status-badge.tsx`: Badge trạng thái ngữ nghĩa (Order, Driver, Kitchen) kèm mapper `status-badge.utils.ts`.
  - `src/components/ui/kpi-card/kpi-card.tsx`: Thẻ thống kê số liệu đồng nhất cho Driver / Merchant / Admin.
  - `src/components/layout/Navbar.tsx`: Sticky header với Location Modal trigger, bộ chuyển VI/EN, Light/Dark toggle, Notification Drawer trigger, Giỏ hàng, Menu người dùng & Mobile Drawer.
  - `src/components/layout/footer/footer.tsx`: Footer 4 cột chuẩn E-commerce (ẩn trên các App Screen vận hành Driver/Merchant/Admin).

---

## 2. Phân tách Page (Customer / Auth) vs App Screen (Operations)

### 2.1 Customer Portal
- **Trang chủ (`/`):** Bố cục E-commerce gồm `HeroSection` (full-width Fresh Green gradient, thanh tìm kiếm thông minh, trending chips, hero visual parallax), `CategoryStrip`, `BannerCarousel`, các Feed quán ăn gợi ý (`RestaurantFeedSection`), lưới `AllRestaurantsInfinite` và `Footer` 4 cột.
- **Thực đơn & Tìm kiếm (`/menu`):** Bộ lọc đa tiêu chí (`SearchBar`, `CategoryFilter`, `TagFilter`, `MenuToolbar`) kết hợp lưới `FoodCard` / `FoodList`.
- **Chi tiết Nhà hàng (`/restaurant/[id]`):** `RestaurantHeader`, danh mục thực đơn theo nhóm và modal thêm giỏ hàng (`CartWidget`, `CartItem`, `ClearCartModal`).
- **Thanh toán (`/checkout`):** Bố cục 2 cột Desktop (cột trái: Địa chỉ, Điểm thưởng Loyalty, Phương thức thanh toán & Ghi chú; cột phải sticky: Tóm tắt đơn hàng, Voucher Drawer & CTA Đặt đơn) cùng sticky bottom bar trên Mobile.
- **Theo dõi đơn hàng (`/orders/[id]`):** `OrderLiveHeader`, `OrderStatusBanner`, `OrderLiveStepper`, bản đồ lộ trình (`OrderVisualRoute` / `OrderTrackingMap`), thẻ tài xế (`OrderDriverCard`), hóa đơn (`OrderBillCard`), `OrderActionBar` và `ReportIssueDialog`.
- **Lịch sử, Hồ sơ, Địa chỉ, Voucher & Điểm thưởng (`/history`, `/profile`, `/profile/addresses`, `/vouchers`, `/rewards`, `/payment/return`):** Đồng bộ Light/Dark semantic tokens, voucher ticket card có notch/ribbon và ví thanh toán (`QuickTopupModal`, `OnlinePaymentGatewayModal`).
- **FoodBot AI Chatbox (`src/features/ai-chat/`):** Trợ lý nổi 24/7 (`ChatWidget`, `ChatPanel`, `ChatInput`, `ChatMessageList`, `ChatMessageItem`).

### 2.2 Auth & Onboarding Portals
- **Đăng nhập & Đăng ký (`/login`, `/register`):** Bố cục split showcase trên Desktop với card giới thiệu tính năng bên trái và form card bên phải (`LoginForm`).
- **Đăng ký Đối tác (`/register/driver`, `/register/restaurant`):** Multi-step onboarding wizard thân thiện.

### 2.3 Operational App Screens (Driver, Merchant, Admin)
- **Driver Portal (`/driver/dashboard`, `/driver`):** Thanh chuyển trạng thái trực tuyến (`DriverStatusSwitch`), lưới KPI (`DriverMetricsGrid`), danh sách cuốc có sẵn (`DriverAvailableTrips`), lịch sử/chi tiết chuyến đi (`DriverTripCard`), popup nhận cuốc (`IncomingTripModal`) và modal rút tiền (`WithdrawModal`).
- **Merchant Portal (`/partner/restaurant`):** Layout sidebar + không gian làm việc trung tâm (`PartnerDashboard`), chế độ hiển thị bếp (`KitchenOrdersTab`), quản lý thực đơn và đối soát rút tiền.
- **Admin Portal (`/admin/*`):** Cập nhật bộ color tokens (`kpi-cards.tsx`, `analytics-charts.tsx`) đồng bộ chuẩn Fresh Green & semantic surfaces.

---

## 3. Kiểm thử & CI Gate

- **Unit Tests:** `npm test` (`node --test`) gồm `src/lib/tests/theme-i18n.test.ts` và `src/features/home/tests/ui-refactor-v2.test.ts` cùng toàn bộ test suite hiện hữu (**199/199 tests passed, 84 suites**).
- **Linter, TypeScript & Build:** `npm run lint` (0 errors, 0 warnings), `npx tsc --noEmit` (0 errors), `npm run build` (29/29 routes thành công).
