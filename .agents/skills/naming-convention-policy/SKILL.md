---
name: naming-convention-policy
description: Quy chuẩn đặt tên (Naming Conventions) bắt buộc cho toàn bộ dự án Food Delivery (áp dụng cho Backend, Frontend, Database, và Files). Kích hoạt skill này mỗi khi tạo mới file, biến, class, interface, hoặc bảng database để đảm bảo tính đồng nhất.
---

# Quy chuẩn Đặt Tên (Naming Convention Policy)

Tài liệu này định nghĩa các quy tắc đặt tên bắt buộc cho toàn bộ mã nguồn của dự án Food Delivery. Các quy tắc này được thiết kế để giữ cho mã nguồn dễ đọc, đồng nhất giữa Frontend (Next.js), Backend (NestJS) và Database.

## 1. Files & Directories (Tập tin & Thư mục)

- **Quy tắc**: Kebab-case (chữ thường, phân cách bằng dấu gạch ngang).
- **Phạm vi**: Tất cả các file và folder (trừ một số file config hệ thống đặc thù).
- **Backend (NestJS)**: Phải có hậu tố (suffix) mô tả loại file.
  - Ví dụ: `user.controller.ts`, `auth.service.ts`, `customer-profile.entity.ts`, `create-user.dto.ts`.
- **Frontend (Next.js)**: 
  - File component: `primary-button.tsx`, `user-profile-card.tsx`.
  - Folder route: `app/dashboard/user-profile/page.tsx`.

## 2. Classes, Interfaces, Types (Lớp & Kiểu dữ liệu)

- **Quy tắc**: PascalCase (Chữ cái đầu mỗi từ viết hoa).
- **Phạm vi**: Tên Class (Controller, Service, Entity), Interface, Type alias, Decorators.
- **Ví dụ**:
  - `class UserController {}`
  - `class CustomerProfileEntity {}`
  - `interface JwtPayload {}`
  - `type OrderStatus = 'PENDING' | 'COMPLETED'`

## 3. Variables, Functions, Methods (Biến & Hàm)

- **Quy tắc**: camelCase (Chữ cái đầu viết thường, các chữ sau viết hoa chữ cái đầu).
- **Phạm vi**: Tên biến cục bộ, biến instance, tên hàm, tên phương thức của class.
- **Ví dụ**:
  - Biến: `let totalAmount = 0;`, `const currentUser = req.user;`
  - Hàm: `function calculateTotal() {}`, `async getOrderById(orderId: string) {}`
- **Lưu ý kiểu boolean**: Các biến hoặc hàm trả về boolean nên có tiền tố `is`, `has`, `should`, `can`. (VD: `isActive`, `hasPermission`).

## 4. Constants & Enums (Hằng số & Enum)

- **Quy tắc**: UPPER_SNAKE_CASE (Viết hoa toàn bộ, phân cách bằng dấu gạch dưới).
- **Phạm vi**: Các hằng số toàn cục (không thay đổi), các giá trị Enum.
- **Ví dụ**:
  - Hằng số: `const MAX_RETRY_COUNT = 3;`, `const JWT_SECRET = process.env.JWT_SECRET;`
  - Enum: `enum Role { ADMIN = 'ADMIN', CUSTOMER = 'CUSTOMER' }`

## 5. Database (PostgreSQL & TypeORM)

- **Quy tắc**: snake_case (Chữ thường, phân cách bằng dấu gạch dưới).
- **Bảng (Tables)**: Bắt buộc dùng tiền tố `m_` (Master) hoặc `t_` (Transaction) như quy định tại `database-schema-policy`.
  - VD: `m_user`, `t_order_item`.
- **Cột (Columns)**: snake_case. Không được viết hoa.
  - VD: `customer_id`, `created_at`, `total_amount`.
- *(Trong code TypeScript, Entity có thể đặt properties là snake_case luôn để map trực tiếp 1-1 với column trong DB, tránh lỗi convert không đáng có, như file Entity chúng ta đã làm).*

## 6. Frontend Specifics (CSS / Tailwind)

- **CSS Classes**: Kebab-case (`.btn-primary`, `.text-blue-500`).
- **React Hooks**: camelCase bắt đầu bằng chữ `use` (`useUser`, `useOrderCart`).

---
> Mọi code sinh ra bắt buộc phải rà soát qua các quy tắc này trước khi lưu file.
