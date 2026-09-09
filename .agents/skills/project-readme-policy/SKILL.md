---
name: project-readme-policy
description: >-
  Quy định bắt buộc đối với mọi tác vụ: Đọc README.md trước khi làm.
  Cập nhật README.md nếu yêu cầu nằm ngoài phạm vi hiện tại trước khi implement.
---

# Bắt buộc: Quy trình xử lý với README.md

Đây là kỹ năng và quy trình bắt buộc cho toàn bộ dự án. Khi thực hiện bất kỳ yêu cầu thay đổi, sửa lỗi, hoặc thêm tính năng nào, Agent **PHẢI** tuân thủ nghiêm ngặt các bước sau:

## 1. Đọc README.md
Trước khi phân tích hay viết bất kỳ dòng code nào, hãy đọc nội dung file `README.md` ở thư mục gốc của dự án để hiểu rõ kiến trúc, công nghệ và lộ trình hiện tại.

## 2. Kiểm tra phạm vi (Scope Check)
Đối chiếu yêu cầu hiện tại của User với các đầu mục trong `README.md`. Xác định xem yêu cầu này đã có trong thiết kế/lộ trình chưa, hay là một yêu cầu hoàn toàn mới (out of scope).

## 3. Cập nhật README.md (Nếu Out of Scope)
Nếu yêu cầu của User nằm ngoài phạm vi của `README.md` hiện tại (ví dụ: thêm service mới, thêm công nghệ mới, hoặc thay đổi logic cốt lõi):
- Agent **BẮT BUỘC** phải sửa đổi file `README.md` để ghi nhận sự thay đổi này (cập nhật lộ trình, kiến trúc, hoặc tính năng).
- Phải hoàn thành việc cập nhật tài liệu này **TRƯỚC KHI** tiến hành implement code.

## 4. Bắt đầu Implement
Chỉ sau khi đã đảm bảo `README.md` phản ánh đúng và đủ thiết kế mới nhất của dự án, Agent mới được phép tiến hành viết hoặc sửa đổi code dự án.
