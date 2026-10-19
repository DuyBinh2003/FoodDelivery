# Thư Mục Kế Hoạch Triển Khai (Implementation Plans)

Thư mục này lưu trữ các bản kế hoạch triển khai chi tiết (`Implementation Plan`) được tạo ra bởi **Planner Agent** trong vòng tròn khép kín của dự án FoodDelivery.

---

## 1. Mục Đích & Nguyên Tắc
- **Single Source of Truth cho Task**: Mọi quyết định kỹ thuật, danh sách file tác động, và kịch bản test 3 nhánh phải được ghi nhận tại đây trước khi viết code.
- **Bàn giao dữ liệu xuyên suốt (State Handoff)**: Là cầu nối thông tin giữa các Sub-Agents:
  - `Planner` ➡️ Khởi tạo và cập nhật kế hoạch.
  - `Coder` ➡️ Đọc yêu cầu kỹ thuật và triển khai code.
  - `Tester` ➡️ Đọc kịch bản test và gán Traceability Header vào file test.
  - `Reviewer` ➡️ Đối chiếu code diff với phạm vi đã cam kết trong plan.
- **Traceability**: Sau khi task hoàn tất, plan được giữ lại làm lịch sử vết kiến trúc, đồng thời tài liệu chuẩn trong `docs/features/` hoặc `docs/services/` sẽ được cập nhật đồng bộ.

---

## 2. Quy Ước Đặt Tên & Trạng Thái

### Tên File
- Sử dụng **kebab-case**: `<tên-ngắn-gọn-của-task>.md`
- Ví dụ: `order-pricing-breakdown.md`, `driver-distance-calculation.md`.

### Vòng Đời Trạng Thái (Lifecycle Statuses)
Mỗi file plan có trường trạng thái ở đầu:
- `[DRAFT]`: Planner vừa lập xong, đang chờ Người dùng duyệt.
- `[APPROVED]`: Người dùng đã xác nhận, sẵn sàng cho Coder thực hiện.
- `[IN_PROGRESS]`: Coder đang triển khai mã nguồn.
- `[TESTING]`: Tester đang viết và chạy Vitest.
- `[REVIEWING]`: Reviewer đang audit mã nguồn độc lập.
- `[AUTO_HEALING]`: Đang trong vòng lặp sửa lỗi tự động giữa Coder và Tester/Reviewer.
- `[COMPLETED]`: Task đã hoàn thành 100%, test pass và docs đã được đồng bộ.
