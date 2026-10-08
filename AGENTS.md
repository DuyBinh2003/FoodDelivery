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