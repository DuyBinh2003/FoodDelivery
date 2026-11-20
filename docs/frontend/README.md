# 🎨 Frontend Architecture & Standards (Next.js)

Thư mục này tổng hợp toàn bộ các quy chuẩn kiến trúc, mẫu thiết kế (design patterns), quy tắc data fetching và hướng dẫn UI/UX áp dụng cho ứng dụng **Frontend (Next.js App Router & Tailwind CSS)** của hệ thống Food Delivery.

---

## 📑 Danh Sách Tài Liệu

| Tài liệu | Trọng tâm nội dung | Đối tượng áp dụng |
| :--- | :--- | :--- |
| **[`frontend-data-fetching.md`](./frontend-data-fetching.md)** | Quy tắc sử dụng Server Components, kỹ thuật bọc `Suspense` chống chặn giao diện, chiến lược Caching (ISR vs No-store), và xử lý Error Boundaries với `error.tsx`. | Frontend Developers |
| **[`frontend-ui.md`](./frontend-ui.md)** | Quy chuẩn thiết kế giao diện: bảng màu HSL, animation vi mô, responsive layout, typography chuẩn hóa, và nguyên tắc thiết kế sang trọng không dùng màu thô sơ. | Frontend & UI/UX Designers |

---

## 🏛️ Triết Lý Kiến Trúc Frontend Cốt Lõi

1. **Next.js App Router & Server Components First**:
   - Mặc định toàn bộ components là **React Server Components (RSC)** để tối ưu SEO và thời gian tải trang ban đầu.
   - Chỉ đánh dấu `'use client'` khi component thực sự cần quản lý state tương tác (`useState`, `useReducer`), hooks trình duyệt (`useEffect`, `window`), hoặc lắng nghe sự kiện (`onClick`, `onChange`).
2. **Feature-Based Module Organization**:
   - Mã nguồn trong `frontend/src/` được chia theo các tính năng độc lập (ví dụ: `auth/`, `restaurant/`, `cart/`, `driver/`) giúp module hóa cao và dễ bảo trì.
3. **Data Client Chuẩn Hóa (`@/lib/api-client`)**:
   - Không dùng `fetch` trần (raw fetch). Mọi yêu cầu gọi backend đều qua `apiClient` để tự động xử lý Base URL, Timeout (10s), Authorization Bearer Header và phân giải lỗi `ApiError`.
4. **Trải Nghiệm Người Dùng Đỉnh Cao (Premium UI/UX & Taste Skill)**:
   - **Chống khuôn mẫu AI sáo rỗng (Anti-Slop Art Direction)**: Áp dụng `.agents/skills/design-taste-frontend` và `.agents/skills/ui-ux-pro-max` để tạo giao diện có bản sắc, loại bỏ các chi tiết thừa thãi vô hồn (headline 3 dòng căn giữa lặp lại, ô icon màu mè vô nghĩa, viền xám mỏng nhạt nhẽo).
   - **Phân định rõ Page vs App Screen**:
     - *Page* (Landing, Menu, Marketing): Bố cục mạnh mẽ, typography cỡ lớn tương phản cao, bảng màu tuyển chọn theo chủ đề.
     - *App Screen* (Admin, Driver, Merchant dashboard): Panel tinh gọn, quiet borders, số liệu thật hiển thị rõ ràng, không lạm dụng hiệu ứng trang trí thừa.
   - Áp dụng micro-animations (nhấp nháy trạng thái trực tuyến, hiệu ứng hover thẻ món ăn, skeleton loader mượt mà).
   - Tối ưu cho thiết bị di động (Mobile-friendly, responsive từ màn hình nhỏ nhất).

---

> [!NOTE]
> Mọi component và trang mới tạo ở Frontend phải tuân thủ nghiêm ngặt 2 tài liệu hướng dẫn trong thư mục này.
