# Quy định chung cho dự án (Project Rules)

Mọi thao tác thay đổi code trên dự án này đều phải tuân thủ nghiêm ngặt quy tắc sau:

**Đọc và Cập nhật README.md trước khi Implement**
1. Luôn đọc `README.md` trước khi bắt đầu công việc.
2. Nếu yêu cầu thay đổi (feature mới, đổi tech stack, v.v.) nằm ngoài (out of scope) nội dung hiện tại của `README.md`, **PHẢI** cập nhật lại file `README.md` để phản ánh đúng thiết kế/tính năng mới đó.
3. Chỉ bắt đầu implement code *sau khi* `README.md` đã được cập nhật thành công (hoặc nếu yêu cầu đã nằm sẵn trong scope).

*Chi tiết hơn có thể xem tại skill `project-readme-policy`.*

**Quy chuẩn Database (Data Modeling)**
Mọi thao tác thay đổi, thêm mới bảng hoặc trường trong Database đều phải tuân thủ chuẩn Microservices và cấu trúc Master (`m_`) / Transaction (`t_`). Khóa chính phải luôn dùng UUID.
*Chi tiết bắt buộc phải xem tại skill `database-schema-policy`.*

**Quy chuẩn Kiến trúc Backend (NestJS)**
Toàn bộ mã nguồn Backend NestJS phải tuân thủ kiến trúc Modular. Controller chỉ để parse request (Thin Controller), logic nằm ở Service. DTO phải được validate chặt chẽ.
*Chi tiết bắt buộc phải xem tại skill `nestjs-patterns`.*

**Quy chuẩn Kiến trúc Frontend (Next.js)**
Toàn bộ mã nguồn Frontend Next.js phải tuân thủ kiến trúc App Router và Feature-Based Design. Logic và UI phải được đóng gói gọn gàng theo từng tính năng (Feature).
*Chi tiết bắt buộc phải xem tại skill `nextjs-patterns`.*

**Quy chuẩn Đặt tên (Naming Conventions)**
Mọi file, biến, class, interface, database table/column đều phải được đặt tên đồng nhất theo quy tắc chuẩn chung.
*Chi tiết bắt buộc phải xem tại skill `naming-convention-policy`.*

**Quy chuẩn Import (Import Conventions)**
Luôn luôn sử dụng đường dẫn tuyệt đối với alias `@/` thay vì đường dẫn tương đối (`./` hoặc `../`) khi import bất kỳ file nào nội bộ trong project. Alias `@/` trỏ tới thư mục `src/`.

**Quy chuẩn UI/UX**
Mọi tác vụ liên quan đến thiết kế, xây dựng, review hoặc sửa đổi giao diện người dùng (UI/UX) đều bắt buộc phải tuân thủ và tham khảo skill `ui-ux-pro-max`. Cần áp dụng các best practice về màu sắc, typography, component và layout đã được chuẩn hoá trong skill này.

**Quy chuẩn Viết Tài liệu (Documentation)**
Bất cứ khi nào triển khai một tính năng logic (feature) mới, bắt buộc phải viết hoặc cập nhật tài liệu kỹ thuật chi tiết vào thư mục `docs/`. Tài liệu cần giải thích luồng hoạt động, API endpoints (nếu có), và cách hệ thống xử lý logic.
