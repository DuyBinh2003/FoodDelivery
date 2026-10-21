# .agents — FoodDelivery Agent Customizations

Thư mục này chứa toàn bộ cấu hình tùy chỉnh cho **Antigravity AI Agent** trong dự án FoodDelivery.
Được tổ chức theo chuẩn **Antigravity Customization System**.

---

## Cấu trúc thư mục

```
.agents/
├── README.md                        # Tài liệu này
├── hooks.json                       # Lifecycle hooks (PreInvocation, PostToolUse, ...)
├── mcp_config.json                  # MCP Server configurations
├── skills.json                      # Khai báo đường dẫn skills registry
├── plugins.json                     # Khai báo đường dẫn plugins registry
│
├── agents/                          # Định nghĩa Sub-Agents chuyên trách
│   ├── orchestrator.md              # Nhạc trưởng điều phối vòng tròn khép kín
│   ├── planner.md                   # Khảo sát & lập Implementation Plan
│   ├── coder.md                     # Lập trình theo Plan đã duyệt
│   ├── tester.md                    # Viết test 3 nhánh & chạy CI Gate
│   └── reviewer.md                  # Thẩm định độc lập (Read-only)
│
├── rules/                           # Quy tắc bắt buộc (luôn active)
│   └── project-rules.md             # Quy trình, code standards, CI Gate
│
├── skills/                          # Skills on-demand (loaded khi cần)
│   ├── general-project-policy/      # Quy chuẩn chung cho mọi task
│   ├── naming-convention-policy/    # Quy chuẩn đặt tên
│   ├── database-schema-policy/      # Quy chuẩn thiết kế DB
│   ├── nestjs-patterns/             # Patterns NestJS Backend
│   ├── nextjs-patterns/             # Patterns Next.js Frontend
│   ├── ui-ux-pro-max/               # Design system & UI/UX
│   ├── documentation-policy/        # Quy chuẩn viết tài liệu
│   └── testing-policy/              # Quy chuẩn viết test
│
├── plugins/                         # Plugin bundles (skills + rules + hooks)
│   └── food-delivery-kit/           # Bundle tổng hợp dự án
│       └── plugin.json              # Plugin manifest
│
└── scripts/                         # Helper scripts cho hooks
    ├── session-reminder.js          # Nhắc agent đọc skills đầu session
    └── remind-ci-gate.js            # Nhắc CI Gate sau khi ghi file
```

---

## Thành phần

### `agents/` — Sub-Agents

| Agent | Vai trò |
|-------|---------|
| `orchestrator.md` | Điều phối toàn bộ pipeline, quản lý auto-healing loop (max 3 vòng) |
| `planner.md` | Lập `docs/plans/<category>/<task>.md`, phân tích codebase & docs |
| `coder.md` | Triển khai code theo Plan, tuân thủ TypeScript strict |
| `tester.md` | Viết Vitest 3 nhánh + chạy 4 bước Local CI Gate |
| `reviewer.md` | Audit độc lập: memory leak, race condition, N+1 query, vi phạm quy chuẩn |

### `rules/` — Always-On Rules

Rules được load tự động và áp dụng cho mọi conversation.

- `project-rules.md`: Tóm tắt quy trình Closed-Loop Pipeline, TypeScript standards, CI Gate.

### `skills/` — On-Demand Skills

Skills chỉ được load khi agent quyết định kích hoạt (progressive disclosure).

| Skill | Kích hoạt khi |
|-------|--------------|
| `general-project-policy` | Mọi task |
| `naming-convention-policy` | Tạo file, biến, class, interface, bảng DB mới |
| `database-schema-policy` | Thiết kế / thay đổi schema DB |
| `nestjs-patterns` | Làm việc với Backend NestJS |
| `nextjs-patterns` | Làm việc với Frontend Next.js |
| `ui-ux-pro-max` | Thiết kế UI/UX, tạo component |
| `documentation-policy` | Tạo mới / cập nhật / cấu trúc lại `docs/` |
| `testing-policy` | Triển khai, sửa đổi hoặc kiểm thử business flows |

### `hooks.json` — Lifecycle Hooks

| Hook | Event | Mô tả |
|------|-------|-------|
| `session-start-reminder` | `PreInvocation` | Nhắc agent đọc skills cần thiết ở đầu session |
| `ci-gate-post-code` | `PostToolUse` | Trigger sau khi ghi/sửa file source code |
| `no-any-guard` | `PreInvocation` | Guard kiểm tra `any` (disabled theo mặc định) |

### `mcp_config.json` — MCP Servers

Placeholder sẵn sàng cho PostgreSQL và filesystem MCP (disabled theo mặc định).
Kích hoạt bằng cách xóa `_disabled` và đổi `_example_*` → tên server thực.

### `plugins/` — Plugin Bundles

- `food-delivery-kit/`: Bundle tổng hợp dự án, sẵn sàng mở rộng với skills/rules/hooks riêng.

---

## Tham chiếu nhanh

- **Quy trình tổng thể**: [../AGENTS.md](../AGENTS.md)
- **Pipeline chi tiết**: [agents/orchestrator.md](agents/orchestrator.md)
- **Tài liệu dự án**: [../docs/](../docs/)
- **Antigravity Customizations Guide**: Built-in skill `agy-customizations`
