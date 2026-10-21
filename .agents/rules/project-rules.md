# Quy định chung cho dự án FoodDelivery (Project Rules)

Tài liệu này định nghĩa các quy tắc bắt buộc áp dụng cho **mọi** task trong dự án.
Các quy tắc này bổ sung và không thay thế `AGENTS.md` ở root.

---

## QUY TRÌNH LÀM VIỆC CỐT LÕI

Mọi task mới từ Người dùng đều vận hành theo quy trình **Autonomous Closed-Loop Pipeline** 5 giai đoạn:

1. **Plan** → tạo `docs/plans/<category>/<task>.md` (trạng thái `[DRAFT]`).
2. **Approval Checkpoint** → hỏi xác nhận Người dùng trước khi code.
3. **Code** → lập trình chính xác theo Plan đã duyệt.
4. **Test & CI Gate** → viết Vitest 3 nhánh, vượt qua 4 bước CI Gate (lint → tsc → test → build).
5. **Review & Docs Sync** → Reviewer audit, đồng bộ tài liệu `docs/`.

---

## QUY CHUẨN CODE TYPESCRIPT

- **Cấm tuyệt đối** dùng `any`. Dùng `unknown` và narrow thay thế.
- **Cấm nuốt exception** âm thầm. Mọi lỗi phải được log và re-throw với `{ cause: error }`.
- **Cấm fallback biến môi trường ngầm**. Nếu thiếu env var, phải throw lỗi cấu hình ngay khi khởi động.
- Import phải dùng **đường dẫn tuyệt đối** (`@/`) — không dùng `../../`.

---

## QUY CHUẨN KIỂM THỬ

- Unit Test Vitest bắt buộc có **Traceability Header** trỏ về file plan.
- Phủ đủ **3 nhánh**: Happy Path, Edge Cases, Error/Rejection Flow.
- CI Gate phải **100% xanh** trước khi nghiệm thu:
  - `npm run lint` → 0 errors/warnings
  - `npx tsc --noEmit` → 0 errors
  - `npm test` → 100% pass
  - `npm run build` → thành công

---

## REFERENCES

- Quy trình chi tiết: [orchestrator.md](../agents/orchestrator.md)
- General Policy: [skills/general-project-policy/SKILL.md](../skills/general-project-policy/SKILL.md)
- Naming Convention: [skills/naming-convention-policy/SKILL.md](../skills/naming-convention-policy/SKILL.md)
- Testing Policy: [skills/testing-policy/SKILL.md](../skills/testing-policy/SKILL.md)
