# UI/UX Refactor Plan — FoodDelivery Frontend v2.0

> **Traceability:** Sinh từ phiên `/grill-me` ngày 2026-11-25.  
> **Người lập plan:** Antigravity (AI Architect)  
> **Trạng thái:** `[COMPLETED]` (Đã triển khai toàn bộ Phase 0 → Phase 5 & vượt qua Local CI Gate)

---

## 1. Tóm tắt quyết định thiết kế (Design Decisions)

| Hạng mục | Quyết định |
|---|---|
| Thị trường | Đa quốc gia — hỗ trợ cả tiếng Việt lẫn tiếng Anh (i18n ready) |
| Platform target | **Desktop-first**, responsive mobile |
| Color palette | **Fresh Green** — sạch, hiện đại, sức khỏe (thay Warm Orange) |
| Light/Dark mode | **Light mode mặc định**, dark mode tùy chọn |
| Layout pattern | **Landing/E-commerce** — Topbar Navbar + Footer đầy đủ |
| Homepage | Thêm **Landing Hero section** trước Feed nhà hàng |
| Actors | Customer + Driver + Merchant (Admin giữ nguyên layout) |
| Animation | **Framer Motion** — parallax, stagger list, page transitions |
| Phạm vi | Toàn bộ: Global theme → từng page (bottom-up) |
| Phạm vi chi tiết | Hero, Footer, Typography system, shadcn upgrade, Responsive |

---

## 2. Design System mới (Fresh Green Theme)

### 2.1 Color Tokens

```css
/* globals.css — :root (Light Mode Default) */
--background: oklch(0.99 0 0);
--foreground: oklch(0.12 0.015 145);
--card: oklch(1 0 0);
--primary: oklch(0.55 0.18 145);        /* Fresh Green #22c55e range */
--primary-foreground: oklch(0.99 0 0);
--primary-light: oklch(0.92 0.08 145);
--primary-dark: oklch(0.42 0.18 145);
--secondary: oklch(0.96 0.02 145);
--accent: oklch(0.72 0.19 85);          /* Vàng lá accent */
--muted: oklch(0.96 0.005 145);
--border: oklch(0.90 0.02 145);
--radius: 0.75rem;
```

### 2.2 Typography
- Font display/heading: **Nunito** (via next/font/google)
- Font body: **Inter** (via next/font/google)
- Scale: display-2xl (4.5rem) → display-xl (3.75rem) → body-lg (1.125rem) → caption (0.75rem)

---

## 3. Phụ thuộc mới

```bash
pnpm add framer-motion
# Font: next/font/google (built-in Next.js)
```

---

## 4. Thứ tự triển khai

### Phase 0 — Global Foundation
- 0.1 `globals.css` → Fresh Green color tokens
- 0.2 `app/layout.tsx` → font Nunito + Inter
- 0.3 `globals.css` → typography variables
- 0.4 Install framer-motion
- 0.5 `components/layout/navbar.tsx` [MỚI]
- 0.6 `components/layout/footer.tsx` [MỚI]
- 0.7 `components/layout/customer-layout.tsx` [MỚI]
- 0.8 `components/ui/motion-list.tsx` [MỚI]
- 0.9 `components/ui/page-transition.tsx` [MỚI]

### Phase 1 — Customer Pages
1. Homepage: Hero section + Category Strip + Restaurant Card v2
2. Restaurant Detail: Cover image + Sticky tabs + Floating cart
3. Checkout: Split 2 cột + Progress stepper
4. Order Tracking: Map 50% + Animated stepper
5. History / Profile / Vouchers / Rewards / Menu/Search

### Phase 2 — Auth Pages
- Login/Register: Split layout + field animations
- Register Restaurant/Driver: Multi-step wizard

### Phase 3 — Driver Portal
- Dashboard: Status toggle + KPI cards + Split map panel + Order queue animation

### Phase 4 — Merchant Portal
- Dashboard: Kitchen display mode + Menu management + Analytics

### Phase 5 — Admin (minor)
- Chỉ cập nhật color tokens → Fresh Green

---

## 5. Test Plan (3 nhánh)

| Nhánh | Nội dung |
|---|---|
| Happy Path | Render đúng, theme tokens đúng màu, Framer Motion không lỗi |
| Edge Case | Responsive, empty states, dark mode |
| Error Flow | API fail → skeleton/error, auth redirect, 404 |

---

## 6. CI Gate

- [x] `npm run lint` → 0 errors, 0 warnings (`eslint`)
- [x] `npx tsc --noEmit` → 0 errors
- [x] `npm test` → 199/199 pass (84 suites, 0 fail)
- [x] `npm run build` → thành công (Next.js 16.3.4 webpack, 29/29 static & dynamic routes)
