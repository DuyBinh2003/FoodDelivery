---
name: general-project-policy
description: >-
  Quy chuẩn làm việc chung (General Standards) cho mọi task: Đọc/cập nhật README, quy định về code TypeScript (không dùng any), đường dẫn import tuyệt đối, và viết tài liệu (docs).
---

# Quy chuẩn dự án chung (General Project Policy)

Kỹ năng này tập hợp các quy định bắt buộc cho toàn bộ dự án. Khi thực hiện bất kỳ task nào, Agent **PHẢI** tuân thủ các điều kiện dưới đây:

## 1. Quy định với README.md
- **Đọc trước khi làm**: Bắt buộc đọc file `README.md` ở thư mục gốc để nắm kiến trúc, tiến độ.
- **Cập nhật nếu Out-of-Scope**: Nếu yêu cầu của User là một tính năng hoàn toàn mới chưa được thiết kế trong `README.md`, Agent BẮT BUỘC phải sửa đổi file `README.md` để ghi nhận sự thay đổi này trước khi implement code.

## 2. Quy chuẩn Code TypeScript (Strictness)
- **Cấm sử dụng `any`**: Tuyệt đối không dùng `any` trong code để tránh lỗi `@typescript-eslint/no-explicit-any`.
- **Định nghĩa Type rõ ràng**: Bắt buộc phải khai báo type, interface rõ ràng.
- **Trường hợp chưa rõ cấu trúc**: Nếu chưa biết chính xác object trả về có format thế nào, hãy sử dụng `unknown` hoặc `Record<string, unknown>`.

## 3. Quy chuẩn Import Đường Dẫn
- **Import tuyệt đối**: Luôn sử dụng đường dẫn tuyệt đối với alias `@/` (trỏ tới `src/`) thay vì dùng đường dẫn tương đối (như `./`, `../`). 
  Ví dụ: `import { Button } from '@/components/Button'` thay vì `import { Button } from '../../components/Button'`.

## 4. Quy chuẩn Viết Tài Liệu (Documentation)
- **Tạo/Cập nhật Docs**: Khi hoàn thành một tính năng mới hoặc API mới, Agent phải cập nhật (hoặc tạo) file markdown tương ứng trong thư mục `docs/`.
- **Cấu trúc phân cấp chuẩn**: Tuân thủ tuyệt đối cấu trúc phân cấp tại `docs/` (`architecture/`, `services/`, `business/`, `features/<actor>/`, `frontend/`).
- **Templates & Checklist**: Bắt buộc đọc và tuân thủ `.agents/skills/documentation-policy/SKILL.md` để áp dụng đúng template chuẩn, bảng API, schema database và đồng bộ các file `README.md` mục lục.

