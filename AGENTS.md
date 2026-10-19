# Quy định chung cho dự án (Project Rules)

Đây là tài liệu gốc định hướng luồng làm việc. Agent bắt buộc tuân thủ cấu trúc sau:

## 1. QUY TRÌNH LÀM VIỆC CỐT LÕI (Autonomous Closed-Loop Pipeline)
Mọi đề bài/task mới từ Người dùng đều được vận hành theo quy trình vòng tròn khép kín:
1. **Giai đoạn 1 - Lập Plan**: Phân tích yêu cầu, khảo sát tài liệu `docs/` & codebase, tạo `docs/plans/<category>/<task>.md` kèm kịch bản test 3 nhánh và cập nhật bảng tra cứu tại `docs/plans/README.md`.
2. **Điểm dừng kiểm duyệt (Approval Checkpoint)**: Dừng lại xin xác nhận của Người dùng về bản Plan.
3. **Giai đoạn 2 - Lập trình**: Triển khai code chuẩn xác theo Plan đã duyệt (cấm `any`, cấm nuốt ngoại lệ, cấm fallback ngầm).
4. **Giai đoạn 3 - Kiểm thử & Tự sửa lỗi (Auto-Healing Loop)**: Viết Vitest 3 nhánh có Traceability Header, chạy `npm test`. Nếu fail hoặc Reviewer yêu cầu sửa, tự động gửi phản hồi cho Coder sửa và chạy lại test (tối đa 3 vòng lặp).
5. **Giai đoạn 4 - Thẩm định độc lập & Đồng bộ**: Reviewer audit lỗi tiềm ẩn/quy chuẩn. Khi đạt chuẩn, tự động đồng bộ tài liệu chính thức trong `docs/` theo `documentation-policy`.

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

## 9. QUY CHUẨN SUB-AGENTS & PHÂN ĐỊNH VAI TRÒ (Sub-Agents Architecture)
Hệ thống Sub-Agents chuyên trách được cấu hình tại `.agents/agents/`:
- **Orchestrator (`.agents/agents/orchestrator.md`)**: Tổng công trình sư điều phối toàn bộ chu trình vòng tròn khép kín, quản lý checkpoint duyệt plan và kích hoạt auto-healing loop (tối đa 3 vòng).
- **Planner (`.agents/agents/planner.md`)**: Khảo sát codebase, tra cứu `docs/`, lập Implementation Plan chi tiết tại `docs/plans/<category>/<task>.md` kèm checklist test 3 nhánh và cập nhật index.
- **Coder (`.agents/agents/coder.md`)**: Lập trình viên thi hành code chính xác theo Plan; cấm `any`, cấm nuốt lỗi, cấm fallback ngầm.
- **Tester (`.agents/agents/tester.md`)**: Viết unit test Vitest 3 nhánh (Happy, Edge, Error) có Traceability Header và chạy `npm test` đạt 100% pass.
- **Reviewer (`.agents/agents/reviewer.md`)**: Thẩm định độc lập (Read-only), phát hiện lỗi tiềm ẩn, rò rỉ tài nguyên, race condition và sai lệch codebase.


