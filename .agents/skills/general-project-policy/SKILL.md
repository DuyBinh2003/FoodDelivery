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

## 5. Quy Chuẩn Không Sử Dụng Fallback Ngầm (No Hidden Fallbacks Policy)
- **Cấm Fallback Biến Môi Trường Ngầm**: Tuyệt đối không dùng fallback ngầm cho biến môi trường cấu hình (ví dụ: `process.env.URL || 'http://localhost:3001'`). Mọi biến môi trường bắt buộc phải:
  1. Khai báo đầy đủ trong `.env.example` và tài liệu cấu hình.
  2. Áp dụng cơ chế **Fail-Fast**: Ném lỗi cấu hình rõ ràng (`ConfigError`) ngay khi khởi động hoặc truy cập nếu thiếu biến, không âm thầm chạy với giá trị localhost mặc định làm lộ cổng hoặc che giấu lỗi môi trường.
- **Cấm Chèn Dữ Liệu Bịa Đặt / Dữ Liệu Giả Trong UI**:
  - Tuyệt đối không chèn dữ liệu mẫu (ví dụ: biển số xe giả `59-X1...`, tên giả `Nguyễn Văn A`, ghi chú món giả `Ít hành lá...`, tên món giả `Món ăn đặc sản`) vào code giao diện thông qua toán tử `||`.
  - Dữ liệu hiển thị phải phản ánh trung thực:
    - Nếu trường không có dữ liệu: Hiển thị trạng thái rỗng trung thực (ví dụ `"Chưa cập nhật"`, `"Không có ghi chú"`) hoặc sử dụng render có điều kiện (conditional rendering) để ẩn trường đó đi.

## 6. Quy Chuẩn Bắt và Xử Lý Ngoại Lệ (Catch & Error Handling Policy)
- **Quy tắc đặt tên biến lỗi**:
  - Luôn đặt tên biến bắt lỗi là `error` hoặc `err` với kiểu tường minh `unknown` (ví dụ: `catch (error: unknown)` hoặc `catch (err)`).
  - **Tuyệt đối không dùng tiền tố `_`** (`_e`, `_err`) nếu biến đó được sử dụng (log, toast, throw).
  - Chỉ dùng `_error` khi thực sự cố tình bỏ qua sau khi đã có comment giải thích rõ lý do VÀ tối thiểu phải có log ở cấp độ `debug`/`warn`.
- **Cấm Nuốt Lỗi Âm Thầm (No Swallowed Exceptions)**:
  - Cấm hoàn toàn `catch (_e) {}` và `.catch(() => {})` để trống khối xử lý mà không có log.
  - **Backend**:
    - Khi xử lý fallback cho các lệnh gọi phụ trợ (như fetch thông tin bổ trợ giữa các microservice): Bắt buộc ghi log cảnh báo bằng NestJS `Logger` (`this.logger.warn(...)` hoặc `this.logger.error(...)`) để giữ nguyên tính quan sát (observability).
    - Khi bọc lại lỗi để ném HTTP Exception mới: Bắt buộc đính kèm `{ cause: error }` (ví dụ `throw new BadRequestException('Thông điệp', { cause: error })`) hoặc ghi log stack trace để không làm mất root cause gốc.
    - Trong Database Transactions: Bắt buộc ghi log lỗi khi gọi `rollbackTransaction()`.
  - **Frontend**:
    - **Background Polling / Sync**: Ghi log `console.warn('[Feature] Polling failed:', error)` thay vì nuốt trắng, giữ nguyên UI để không làm phiền người dùng.
    - **User Action / Initial Page Load**: Bắt buộc ghi log `console.error` và hiển thị Toast thông báo lỗi / Error State (sử dụng `getErrorMessage(error)`) để người dùng không bị kẹt trong trạng thái loading hoặc im lặng.


