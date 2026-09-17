---
name: database-schema-policy
description: >-
  Quy chuẩn thiết kế Database (PostgreSQL) cho dự án Food Delivery.
  Bao gồm cách đặt tên bảng (m_, t_), cấu trúc schema (Microservices), và các trường bắt buộc.
---

# Database Schema Policy

Khi có yêu cầu tạo bảng mới, thêm trường mới hoặc chỉnh sửa Database, Agent **BẮT BUỘC** phải tuân thủ các quy tắc sau (đã được thống nhất qua các bảng core):

## 1. Naming Conventions (Quy tắc đặt tên)
- **Master Tables (Dữ liệu gốc, ít thay đổi):** Phải có tiền tố `m_`. Ví dụ: `m_user`, `m_restaurant`, `m_category`.
- **Transaction Tables (Dữ liệu phát sinh liên tục):** Phải có tiền tố `t_`. Ví dụ: `t_order`, `t_payment`.
- **Database Schema:** Dự án chia theo Microservices, do đó mỗi service phải có schema riêng (`schema_user`, `schema_restaurant`, `schema_order`, v.v.). Bảng thuộc service nào phải nằm trong schema tương ứng.

## 2. Core Fields (Các trường bắt buộc)
Mọi bảng được tạo mới ĐỀU PHẢI có các trường sau:
- **`id`**: Sử dụng `UUID` và default `uuid_generate_v4()`. Không dùng `SERIAL`/`BIGINT` auto-increment.
- **`created_at`**: `timestamptz`, default `CURRENT_TIMESTAMP`.
- **`updated_at`**: `timestamptz`, default `CURRENT_TIMESTAMP`.
- **`is_deleted`**: `boolean`, default `false`. Toàn bộ dự án sử dụng **Soft Delete**, tuyệt đối không dùng lệnh `DELETE` vật lý.

## 3. Relationships & Foreign Keys
- **Trong cùng một Schema:** BẮT BUỘC dùng Foreign Key constraint (vd: `m_menu_item` tham chiếu `m_restaurant` bằng `ON DELETE RESTRICT`). Hạn chế dùng `CASCADE` trừ khi có logic cực kỳ đặc thù.
- **Giữa các Schema khác nhau:** **KHÔNG** tạo Foreign Key constraint ở mức Database (Ví dụ `t_order` ở `schema_order` trỏ sang `m_user` ở `schema_user`). Chỉ lưu `UUID` của entity được trỏ tới như một tham chiếu logic (Logical Reference). Việc đảm bảo tính toàn vẹn dữ liệu xuyên schema sẽ do Application Level (Code) đảm nhiệm.

## 4. Công cụ Migration
- Dự án sử dụng `node-pg-migrate`.
- Lệnh tạo file migration mới: `npm run migrate:create -- <tên-migration>`.
- **Quy tắc đặt tên file Migration (Production):** Khi tạo file migration, CLI sẽ tự động sinh timestamp ở đầu file để định hướng thứ tự chạy. BẮT BUỘC giữ nguyên chuỗi timestamp này. Tuy nhiên, phần hậu tố (tên migration do bạn đặt) phải tuân theo chuẩn `create_<tên>` (nếu tạo table/schema) hoặc `init_<tên>` (nếu seed data/khởi tạo ban đầu). Ví dụ: `1789371936744_create_search_tables.js` hoặc `1789353917001_init_seed_users.js`. KHÔNG ĐƯỢC để các tên mặc định vô nghĩa.
- **Quy tắc cho môi trường Phát triển (Dev Environment):** Ở môi trường dev (khi có thể dễ dàng reset DB), **KHÔNG** tạo thêm file migration mới mỗi khi cần thêm bảng thuộc về một schema đã có. Thay vào đó, hãy **gom nhóm** bằng cách chỉnh sửa trực tiếp vào file migration `create_...` ban đầu của schema đó (thêm bảng, thêm cột) và cập nhật file `init_...` seed data tương ứng. Điều này giúp tránh rác (phân mảnh) các file migration. Chỉ tạo file mới khi thực sự làm việc trên một schema mới hoặc khi code đã release (không thể sửa file cũ).
- Code migration phải tuân thủ format ES Modules (như trong các file migration hiện tại).
