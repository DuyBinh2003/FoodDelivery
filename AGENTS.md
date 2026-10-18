# Quy định chung cho dự án (Project Rules)

Đây là tài liệu gốc định hướng luồng làm việc. Agent bắt buộc tuân thủ cấu trúc sau:

## 1. QUY TRÌNH LÀM VIỆC CỐT LÕI
1. **Phân tích yêu cầu**: Xác định tính năng thuộc Frontend, Backend, hay Database.
2. **Khảo sát skill**: Dùng công cụ đọc file để đọc các policy tương ứng trong `.agents/skills/` trước khi lên kế hoạch.

## 2. QUY CHUẨN KỸ THUẬT VÀ PHONG CÁCH CODE (General Policy)
Tất cả các yêu cầu về:
- Đọc và cập nhật `README.md`
- Code TypeScript (Strictness, không dùng `any`)
- Import đường dẫn tuyệt đối (`@/`)
- Viết Document (`docs/`)
- Cấm fallback biến môi trường ngầm và cấm dùng dữ liệu mẫu giả trong UI (No Hidden Fallbacks)
- Bắt và xử lý ngoại lệ chuẩn chỉ, cấm nuốt lỗi âm thầm (No Swallowed Exceptions), bảo toàn root cause qua Logger và `{ cause: error }`
**Hành động tham chiếu**: Bắt buộc đọc `.agents/skills/general-project-policy/SKILL.md` cho mọi task.

## 3. QUY CHUẨN ĐẶT TÊN (Naming Convention)
- Định nghĩa cách đặt tên cho file, biến, class, interface, bảng database,...
**Hành động tham chiếu**: Kích hoạt `.agents/skills/naming-convention-policy/SKILL.md`.

## 4. QUY CHUẨN DATABASE (Data Modeling)
- Kiến trúc Microservices, bảng Master (`m_`) / Transaction (`t_`), khóa chính dùng UUID.
**Hành động tham chiếu**: Đọc `.agents/skills/database-schema-policy/SKILL.md`.

## 5. QUY CHUẨN BACKEND (NestJS)
- Tuân thủ kiến trúc Modular, Thin Controller (chỉ parse request), Service xử lý logic, DTO validate chặt chẽ.
**Hành động tham chiếu**: Đọc `.agents/skills/nestjs-patterns/SKILL.md`.

## 6. QUY CHUẨN FRONTEND & UI/UX (Next.js)
- Kiến trúc App Router, Feature-Based Design.
- Giao diện cao cấp, UX/UI animation hiện đại.
**Hành động tham chiếu**: Đọc `.agents/skills/nextjs-patterns/SKILL.md` và `.agents/skills/ui-ux-pro-max/SKILL.md`.

## 7. QUY CHUẨN TÀI LIỆU DỰ ÁN (Documentation Policy)
- Cấu trúc phân cấp nghiêm ngặt trong `docs/`: `architecture/`, `services/`, `business/`, `features/<actor>/`, `frontend/`.
- Tài liệu song hành cùng mã nguồn (Docs-as-Code), cập nhật đồng bộ các file mục lục `README.md`.
- Bắt buộc dùng Mermaid cho sơ đồ luồng và tuân thủ templates chuẩn.
**Hành động tham chiếu**: Bắt buộc đọc `.agents/skills/documentation-policy/SKILL.md` khi tạo mới, cập nhật, hoặc tái cấu trúc tài liệu.

## 8. QUY CHUẨN KIỂM THỬ (Testing Policy)
- Bắt buộc viết Unit Test (Vitest) cho 100% các Use Case / Luồng nghiệp vụ (Business Flow).
- Test bám sát Docs / Implementation Plan, có Traceability Header, phủ đủ 3 nhánh (Happy Path, Edge Cases, Error / Rejection Flow).
- Đặt tập trung trong `apps/<service>/src/modules/<module>/tests/<flow-or-usecase>.spec.ts`.
- Bắt buộc chạy `npm test` và đạt 100% pass trước khi nghiệm thu hoàn thành task.
**Hành động tham chiếu**: Bắt buộc đọc `.agents/skills/testing-policy/SKILL.md` khi triển khai, sửa đổi hoặc kiểm thử các luồng nghiệp vụ.
