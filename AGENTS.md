# Quy định chung cho dự án (Project Rules)

**QUY TRÌNH LÀM VIỆC BẮT BUỘC:**
1. Phân tích yêu cầu và xác định tính năng thuộc Frontend, Backend hay Database.
2. Dùng công cụ đọc file để đọc các policy tương ứng trong thư mục `.agents/skills/` trước khi lên kế hoạch implement.

**Đọc và Cập nhật README.md trước khi Implement**
1. Luôn đọc `README.md` trước khi bắt đầu công việc.
2. Nếu yêu cầu thay đổi nằm ngoài scope hiện tại, BẮT BUỘC cập nhật lại `README.md`.
3. Hành động tham chiếu: Bắt buộc đọc `.agents/skills/project-readme-policy/policy.md`.

**Quy chuẩn Database (Data Modeling)**
- Mọi bảng/trường phải tuân thủ chuẩn Microservices: cấu trúc Master (`m_`) / Transaction (`t_`).
- Khóa chính BẮT BUỘC dùng UUID.
- Hành động tham chiếu: Bắt buộc đọc `.agents/skills/database-schema-policy/policy.md` trước khi tạo migration/schema.

**Quy chuẩn Kiến trúc Backend (NestJS)**
- Tuân thủ kiến trúc Modular, Thin Controller (chỉ parse request), Service xử lý logic, DTO validate chặt chẽ.
- Hành động tham chiếu: Bắt buộc đọc `.agents/skills/nestjs-patterns/policy.md`.

**Quy chuẩn Kiến trúc Frontend (Next.js)**
- Tuân thủ App Router và Feature-Based Design.
- Hành động tham chiếu: Bắt buộc đọc `.agents/skills/nextjs-patterns/policy.md`.

**Quy chuẩn Đặt tên & Import (Naming & Imports)**
- Đặt tên đồng nhất. Hành động tham chiếu: Đọc `.agents/skills/naming-convention-policy/policy.md`.
- QUAN TRỌNG: Luôn sử dụng đường dẫn tuyệt đối với alias `@/` (trỏ tới `src/`) thay vì tương đối (`./`, `../`). 

**Quy chuẩn UI/UX**
- Bắt buộc đọc `.agents/skills/ui-ux-pro-max/policy.md` trước khi gen code cho các component giao diện.

**Quy chuẩn Viết Tài liệu (Documentation)**
- Luôn tạo hoặc cập nhật file markdown trong `docs/` để giải thích luồng hoạt động và API endpoint cho feature mới.

**Quy chuẩn Code TypeScript (TypeScript Strictness)**
- TUYỆT ĐỐI KHÔNG sử dụng `any` trong code để tránh lỗi `@typescript-eslint/no-explicit-any`. 
- Bắt buộc phải định nghĩa type hoặc interface rõ ràng. Nếu chưa rõ cấu trúc, hãy sử dụng `unknown` hoặc `Record<string, unknown>`.