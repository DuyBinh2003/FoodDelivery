# 📋 Kế Hoạch Triển Khai: Vá Lỗ Hổng Bảo Mật & Tăng Cường Phòng Thủ Hệ Thống Trước Khi Deploy (Security Hardening Pre-Deployment Patch)

`[COMPLETED]` • **Issue liên kết:** #101 • **Phân loại:** `platform` • **Ngày khởi tạo:** 2026-11-22

---

## 1. 🎯 Tổng Quan & Mục Tiêu

### 1.1. Hiện trạng & Lỗ hổng bảo mật đã phát hiện
Quá trình kiểm toán an ninh hệ thống trước khi deploy lên môi trường AWS Cloud đã phát hiện 14 điểm yếu bảo mật, trong đó có 4 lỗ hổng nghiêm trọng (Critical) và 4 lỗ hổng nguy cơ cao (High) cần được vá khẩn cấp:
1. **Gian lận ví & nạp tiền ảo (CVSS 10.0)**: Endpoint `POST /payment/webhooks/simulate` đang công khai, sử dụng hardcoded key để tự ký và cộng tiền trực tiếp vào tài khoản ví qua `topupWalletUseCase`.
2. **Quản trị nhà hàng không xác thực (CVSS 9.8)**: Các endpoint `DELETE`, `PATCH`, `POST` tại `restaurants.controller.ts` không gắn `JwtAuthGuard`, cho phép bất kỳ ai xóa/sửa nhà hàng và món ăn.
3. **BOLA / IDOR & Thao túng trạng thái đơn hàng (CVSS 9.4)**: `GET /orders/:id` và `PATCH /orders/:id/status` không kiểm tra quyền sở hữu đơn hàng; khách hàng có thể xem địa chỉ người khác hoặc tự đổi đơn sang `COMPLETED` để trục lợi điểm tích lũy.
4. **Fallback bí mật ngầm (CVSS 9.1)**: `jwt.strategy.ts` fallback về `'default-secret'`; `payment-gateway.service.ts` fallback về key demo sandbox, vi phạm nguyên tắc "No Hidden Fallbacks".
5. **Secrets bị track trong Git (CVSS 7.5)**: `.env` và `backend/.env` đang bị track trong Git index.
6. **Timing Attack thanh toán (CVSS 7.4)**: So sánh HMAC signature bằng toán tử `===` trong webhook VNPay/MoMo.
7. **Container chạy quyền Root (CVSS 7.2)**: `ai-python/Dockerfile` chạy quyền root, không có non-root user.
8. **Rò rỉ token qua URL & DoS Bcrypt (CVSS 5.3)**: `JwtStrategy` chấp nhận `?token=...` trên URL; `RegisterDto` thiếu giới hạn độ dài mật khẩu `@MaxLength(72)`.
9. **BOLA Dispute & Voucher Campaign Kill Switch (CVSS 5.0)**: Bất kỳ ai cũng có thể gọi `POST /vouchers/campaigns/:id/emergency-kill` và xem chi tiết khiếu nại của người khác.

### 1.2. Mục tiêu đạt được
- Triệt tiêu 100% các lỗ hổng Critical & High.
- Đảm bảo tính toàn vẹn dữ liệu tài chính, nhà hàng và đơn hàng.
- Tuân thủ nghiêm ngặt nguyên tắc: **Fail-Fast**, **No Swallowed Exceptions**, **No Hidden Fallbacks**, **Strict TypeScript (No `any`)**.
- Vượt qua bộ tứ Local CI Gate:
  1. `npm run lint` (0 warning/error).
  2. `npx tsc --noEmit` (0 error).
  3. `npm test` (100% pass trên toàn bộ test suite).
  4. `npm run build` (Biên dịch thành công).

---

## 2. 🔍 Danh Sách File Tác Động & Phương Án Kỹ Thuật

| Thành phần / File | Hành động kỹ thuật chi tiết |
| :--- | :--- |
| [`backend/apps/payment-service/src/modules/ledger/payment-gateway.controller.ts`](file:///d:/code/FoodDelivery/backend/apps/payment-service/src/modules/ledger/payment-gateway.controller.ts) | Vô hiệu hóa `simulateWebhook` trên production (`if (process.env.NODE_ENV === 'production') throw new NotFoundException()`). |
| [`backend/apps/payment-service/src/modules/ledger/services/payment-gateway.service.ts`](file:///d:/code/FoodDelivery/backend/apps/payment-service/src/modules/ledger/services/payment-gateway.service.ts) | Thay so sánh chuỗi `===` bằng `crypto.timingSafeEqual`. Đổi secret retrieval sang `configService.getOrThrow`. |
| [`backend/apps/restaurant-service/src/modules/restaurants/restaurants.controller.ts`](file:///d:/code/FoodDelivery/backend/apps/restaurant-service/src/modules/restaurants/restaurants.controller.ts) | Bổ sung `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.RESTAURANT)` cho `create`, `update`, `remove`, `addMenuItem`, `updateMenuItem`, `removeMenuItem`. |
| [`backend/apps/order-service/src/modules/orders/orders.controller.ts`](file:///d:/code/FoodDelivery/backend/apps/order-service/src/modules/orders/orders.controller.ts) | Bổ sung `@CurrentUser() user: JwtPayload` vào `findOne` và `updateStatus`. Truyền `user` vào usecase để kiểm tra quyền sở hữu. |
| [`backend/apps/order-service/src/modules/orders/usecases/get-order.usecase.ts`](file:///d:/code/FoodDelivery/backend/apps/order-service/src/modules/orders/usecases/get-order.usecase.ts) | Thêm logic kiểm tra BOLA: chỉ admin, customer tạo đơn, driver nhận đơn hoặc restaurant liên quan mới được xem đơn hàng. |
| [`backend/apps/order-service/src/modules/orders/usecases/update-order-status.usecase.ts`](file:///d:/code/FoodDelivery/backend/apps/order-service/src/modules/orders/usecases/update-order-status.usecase.ts) | Thêm state machine guard: Customer chỉ được hủy khi PENDING; Driver/Restaurant chỉ được cập nhật trạng thái tương ứng; Admin có toàn quyền. |
| [`backend/apps/user-service/src/modules/auth/strategies/jwt.strategy.ts`](file:///d:/code/FoodDelivery/backend/apps/user-service/src/modules/auth/strategies/jwt.strategy.ts) | Xóa bỏ `|| 'default-secret'`, dùng `configService.getOrThrow<string>('jwt.secret')`. |
| [`backend/libs/common/src/guards/jwt.strategy.ts`](file:///d:/code/FoodDelivery/backend/libs/common/src/guards/jwt.strategy.ts) | Xóa bỏ `ExtractJwt.fromUrlQueryParameter('token')`. |
| [`backend/apps/user-service/src/modules/auth/dto/auth.dto.ts`](file:///d:/code/FoodDelivery/backend/apps/user-service/src/modules/auth/dto/auth.dto.ts) | Thêm `@MaxLength(72)` cho `password` để chống DoS CPU Bcrypt. |
| [`backend/apps/order-service/src/modules/orders/vouchers.controller.ts`](file:///d:/code/FoodDelivery/backend/apps/order-service/src/modules/orders/vouchers.controller.ts) | Thêm `@UseGuards(RolesGuard)` và `@Roles(UserRole.ADMIN)` cho `emergencyKillCampaign` và `createCampaign`. |
| [`backend/apps/admin-service/src/modules/admin/dispute.controller.ts`](file:///d:/code/FoodDelivery/backend/apps/admin-service/src/modules/admin/dispute.controller.ts) | Thêm check `user.role === 'ADMIN' || dispute.customer_id === user.id` trong `getDisputeById`. |
| [`ai-python/Dockerfile`](file:///d:/code/FoodDelivery/ai-python/Dockerfile) | Tạo và chỉ định non-root user `appuser` (UID 1001). |
| [`gateway/nginx.conf`](file:///d:/code/FoodDelivery/gateway/nginx.conf) | Thêm block explicit deny cho `/payment/webhooks/simulate` và bổ sung các security headers chuẩn. |
| [Git Index] | Chạy `git rm --cached .env backend/.env` để gỡ bỏ tracking credentials. |

---

## 3. 🧪 Kịch Bản Kiểm Thử 3 Nhánh (3-Branch Test Checklist)

### Nhánh 1: Happy Path (Luồng Hoạt Động Chuẩn)
- [ ] **HP-01**: Khách hàng tạo đơn hàng và xem lại chi tiết đơn hàng của chính mình (`GET /orders/:id`) -> Thành công trả về 200 OK kèm đầy đủ thông tin.
- [ ] **HP-02**: Tài xế được gán đơn xem chi tiết đơn hàng (`GET /orders/:id`) -> Thành công trả về 200 OK.
- [ ] **HP-03**: Quản trị viên (Admin) xem chi tiết bất kỳ đơn hàng nào -> Thành công trả về 200 OK.
- [ ] **HP-04**: Nhà hàng cập nhật món ăn hoặc nhà hàng của mình (`PATCH /partner/my-restaurant/...`) -> Thành công 200 OK.
- [ ] **HP-05**: Webhook VNPay gửi chữ ký hợp lệ -> `timingSafeEqual` xác thực thành công và cộng tiền ví.

### Nhánh 2: Edge Cases (Biên & Điều Kiện Bất Thường)
- [ ] **EC-01**: Khách hàng gửi mật khẩu có độ dài chính xác 72 ký tự (`@MaxLength(72)`) -> Đăng ký thành công, bcrypt xử lý mượt mà.
- [ ] **EC-02**: Webhook signature có độ dài sai lệch hoặc thiếu ký tự -> `timingSafeEqual` từ chối an toàn, không gây crash `RangeError`.
- [ ] **EC-03**: Request chứa token qua URL query parameter `?token=...` -> Bị từ chối xác thực (yêu cầu gửi qua `Authorization: Bearer`).

### Nhánh 3: Error & Security Rejection Flow (Chặn Tấn Công)
- [ ] **ER-01**: Kẻ tấn công gọi `POST /payment/webhooks/simulate` khi `NODE_ENV=production` -> Bị chặn với lỗi `404 Not Found`.
- [ ] **ER-02**: Khách hàng A gọi `GET /orders/:id` của khách hàng B -> Bị từ chối với lỗi `403 Forbidden` (Chống BOLA).
- [ ] **ER-03**: Khách hàng gọi `PATCH /orders/:id/status` với trạng thái `COMPLETED` -> Bị từ chối `403 Forbidden`.
- [ ] **ER-04**: Người dùng chưa đăng nhập gọi `DELETE /restaurants/:id` hoặc `POST /restaurants/:id/menu-items` -> Bị từ chối `401 Unauthorized`.
- [ ] **ER-05**: Khách hàng bình thường gọi `POST /vouchers/campaigns/:id/emergency-kill` -> Bị từ chối `403 Forbidden`.
- [ ] **ER-06**: Người dùng đăng ký gửi mật khẩu dài > 72 ký tự -> Bị từ chối `400 Bad Request` bởi `ValidationPipe` (Chống DoS CPU).
- [ ] **ER-07**: Khởi động hệ thống khi thiếu biến môi trường `JWT_SECRET` -> Ném lỗi Fail-Fast ngay lập tức, không dùng fallback ngầm.

---

## 4. 🚀 Kế Hoạch Thực Hiện Chi Tiết

1. **Bước 1**: Untrack `.env` và `backend/.env` khỏi Git.
2. **Bước 2**: Vá Payment Gateway Service & Controller (vô hiệu hóa simulate webhook, timingSafeEqual, getOrThrow).
3. **Bước 3**: Thêm Guard cho Restaurant Controller & sửa DTO validation.
4. **Bước 4**: Thêm BOLA checks cho Order Controller & UseCases.
5. **Bước 5**: Thêm Role checks cho Vouchers Controller & Dispute Controller.
6. **Bước 6**: Vá Common JwtStrategy & User-Service JwtStrategy (loại bỏ query param token, Fail-Fast secret).
7. **Bước 7**: Cập nhật DTO mật khẩu trong `user-service`.
8. **Bước 8**: Cập nhật `ai-python/Dockerfile` sang non-root user.
9. **Bước 9**: Cập nhật `gateway/nginx.conf` chặn simulate và thêm security headers.
10. **Bước 10**: Viết Unit Tests Vitest cho các kịch bản kiểm thử bảo mật.
11. **Bước 11**: Chạy kiểm tra bộ tứ Local CI Gate: Lint, Type Check, Unit Tests, Build.
12. **Bước 12**: Bàn giao Reviewer và đồng bộ tài liệu.
