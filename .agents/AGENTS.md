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
