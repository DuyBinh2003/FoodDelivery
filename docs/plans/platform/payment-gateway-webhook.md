# Kế Hoạch Triển Khai: Tích Hợp Cổng Thanh Toán Trực Tuyến (VNPay / MoMo) & Webhook Idempotency

> **Mã công việc (Task Code):** `payment-gateway-webhook`  
> **Trạng thái:** `[COMPLETED]`  
> **Tác giả:** `@planner` (Điều phối bởi `@orchestrator`)  
> **Nhánh phát triển:** `feature/issue-77-payment-gateway-webhook`  
> **GitHub Issue:** [#77](https://github.com/DuyBinh2003/FoodDelivery/issues/77)  
> **Tài liệu tham chiếu:** `docs/services/payment-service.md`, `docs/services/order-service.md`, `docs/architecture/fintech-ledger-accounting.md`

---

## 1. Bối Cảnh & Mục Tiêu Nghiệp Vụ (Context & Business Objectives)

Hiện tại, hệ thống đã hoàn thiện Sổ cái kép (Double-Entry Ledger) và giao dịch ví nội bộ / tiền mặt (COD). Để hỗ trợ người dùng nạp tiền vào ví hoặc thanh toán đơn hàng trực tiếp bằng phương thức thanh toán điện tử phổ biến tại Việt Nam (VNPay QR, Thẻ ATM nội địa, Thẻ quốc tế, Ví MoMo), Payment Service cần mở rộng khả năng giao tiếp với các Cổng thanh toán trực tuyến bên ngoài.

### Mục tiêu cốt lõi:
1. **Khởi tạo giao dịch thanh toán (Payment URL & QR Generation)**:
   - Cho phép khách hàng chọn cổng thanh toán (`VNPAY` hoặc `MOMO`).
   - Tạo mã tham chiếu giao dịch độc nhất và ký số bảo mật bằng thuật toán tiêu chuẩn (HMAC-SHA512 đối với VNPay, HMAC-SHA256 đối với MoMo).
   - Sinh đường dẫn thanh toán an toàn kèm thông tin QR Pay để chuyển hướng người dùng hoặc hiển thị trên ứng dụng di động/web.
2. **Xử lý Webhook / Instant Payment Notification (IPN Listener)**:
   - Tiếp nhận thông báo bất đồng bộ từ máy chủ VNPay / MoMo khi người dùng hoàn tất thanh toán.
   - Xác minh tính toàn vẹn và xuất xứ qua việc kiểm tra chữ ký số (Signature Verification). Từ chối 400 nếu chữ ký không khớp.
3. **Cơ chế Chống trùng lặp & Tấn công phát lại (Webhook Idempotency & Replay Attack Defense)**:
   - Sử dụng bảng `t_idempotency_key` trong `schema_payment`.
   - Đảm bảo khi cổng thanh toán bắn lại Webhook nhiều lần (do mạng lag hoặc retry policy), hệ thống chỉ hạch toán đúng 1 lần duy nhất, các lần sau phản hồi `Success` mà không tạo thêm bút toán trùng.
4. **Hạch toán dòng tiền vào Sổ cái kép (Double-Entry Settlement)**:
   - Tự động ghi nhận giao dịch:
     - `DEBIT SYS_ASSET_GATEWAY_VNPAY / SYS_ASSET_GATEWAY_MOMO` (Tài sản thanh khoản của sàn tại ngân hàng/cổng tăng).
     - `CREDIT m_wallet_account` người nhận (Nợ phải trả khách hàng tăng - trường hợp nạp ví) HOẶC thanh toán đơn hàng thành công (`PaymentIntent: SUCCEEDED`).

---

## 2. Kiến Trúc Kỹ Thuật & Sơ Đồ Luồng (Architecture & Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách Hàng (Customer)
    participant FE as Next.js Client
    participant GW as API Gateway (Nginx :3000)
    participant PaySvc as Payment Service (:3007)
    participant ExtGate as External Gateway (VNPay / MoMo)
    participant LedgerDB as PostgreSQL (schema_payment)

    Note over Customer,LedgerDB: GIAI ĐOẠN 1: TẠO URL THANH TOÁN
    Customer->>FE: Chọn nạp 200k qua VNPay
    FE->>GW: POST /payment/gateway/create-url (amount, paymentMethod: VNPAY, walletAccountId)
    GW->>PaySvc: CreatePaymentUrl()
    PaySvc->>PaySvc: Sinh txnRef, tính chữ ký HMAC-SHA512
    PaySvc-->>FE: Trả về paymentUrl & qrPayload
    FE-->>Customer: Chuyển hướng sang VNPay Sandbox hoặc hiển thị QR

    Note over Customer,LedgerDB: GIAI ĐOẠN 2: THANH TOÁN & WEBHOOK IPN (ATOMIC IDEMPOTENCY)
    Customer->>ExtGate: Quét mã QR & Xác nhận trừ tiền ngân hàng
    ExtGate->>GW: POST /payment/webhooks/vnpay (IPN Callback kèm chữ ký vnp_SecureHash)
    GW->>PaySvc: HandleWebhook(vnpay_params)
    PaySvc->>PaySvc: 1. Xác thực HMAC-SHA512 chữ ký số
    PaySvc->>LedgerDB: 2. Kiểm tra Idempotency Key (t_idempotency_key)
    alt Đã xử lý trước đó (Duplicate Webhook)
        PaySvc-->>ExtGate: Trả về { RspCode: "00", Message: "Already Confirmed" }
    else Xử lý lần đầu (First-time valid)
        PaySvc->>LedgerDB: Khóa idempotency_key (status: PROCESSING)
        PaySvc->>LedgerDB: Ghi sổ cái: DEBIT SYS_ASSET_GATEWAY_VNPAY, CREDIT User Wallet
        PaySvc->>LedgerDB: Cập nhật idempotency_key (status: COMPLETED)
        PaySvc-->>ExtGate: Trả về { RspCode: "00", Message: "Confirm Success" }
    end
```

---

## 3. Cấu Trúc Dữ Liệu & Ràng Buộc (Database & Security)

Hệ thống tận dụng cơ sở dữ liệu `schema_payment` hiện có:
- **`t_idempotency_key`**: Lưu trữ mã khóa duy nhất `gateway_{gateway_name}_{transaction_ref}`, trạng thái xử lý (`PROCESSING`, `SUCCEEDED`, `FAILED`) và response snapshot.
- **`m_wallet_account` & `m_wallet_balance`**: Tự động sinh tài khoản tài sản hệ thống `SYS_ASSET_GATEWAY_VNPAY`, `SYS_ASSET_GATEWAY_MOMO` loại `ASSET` để đối ứng với ví người dùng loại `LIABILITY`.
- **`t_ledger_transaction` & `t_ledger_entry`**: Lưu nhật ký bút toán kép bất biến (Append-Only).

---

## 4. Danh Sách API Triển Khai

| Phương thức | Đường dẫn | Phân quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/payment/gateway/create-url` | JwtAuthGuard | Tạo URL chuyển hướng thanh toán và dữ liệu QR Pay |
| `POST` | `/payment/webhooks/vnpay` | Public (Gateway Callback) | Webhook IPN tiếp nhận kết quả giao dịch từ VNPay |
| `POST` | `/payment/webhooks/momo` | Public (Gateway Callback) | Webhook IPN tiếp nhận kết quả giao dịch từ MoMo |
| `GET` | `/payment/webhooks/vnpay-return` | Public (Client Return) | URL người dùng chuyển hướng về sau khi thanh toán xong |
| `POST` | `/payment/webhooks/simulate` | Dev / Test Only | Mô phỏng webhook nạp tiền để kiểm thử tự động |

---

## 5. Kiến Trúc Giao Diện Người Dùng & Các Điểm Chạm (Frontend UI / UX Architecture)

### 5.1 Tùy chọn Cổng Thanh toán tại Trang Thanh Toán (`/checkout`)
- Bổ sung 2 phương thức thanh toán trực tuyến vào danh sách lựa chọn:
  1. **VNPAY QR / Thẻ ATM / Quốc tế**: Logo nhận diện VNPAY màu xanh dương, mô tả: *"Quét mã QR qua 40+ ứng dụng ngân hàng & Ví VNPAY"*.
  2. **Ví điện tử MoMo**: Logo nhận diện MoMo màu hồng đặc trưng, mô tả: *"Thanh toán nhanh qua ứng dụng Ví MoMo"*.
- Khi chọn VNPAY hoặc MoMo và bấm **"Đặt hàng"**:
  - Tạo đơn hàng trên `order-service`.
  - Gọi API `POST /payment/gateway/create-url` để lấy `paymentUrl`, `qrPayload`, `transactionRef`.
  - Mở Modal **`OnlinePaymentGatewayModal`** hiển thị mã QR thanh toán động kèm liên kết chuyển hướng.

### 5.2 Component Modal Thanh Toán Cổng Trực Tuyến (`OnlinePaymentGatewayModal.tsx`)
- Thiết kế **Dark Glassmorphism** đồng bộ phong cách cao cấp của FoodDelivery:
  - **Mã QR Pay động**: Hiển thị mã QR thanh toán rõ nét (sử dụng SVG generator chất lượng cao) kèm số tiền định dạng VND.
  - **Đồng hồ đếm ngược giao dịch (15 phút)**: Hiển thị thời gian còn lại trước khi mã QR hết hạn.
  - **Nút "Mở Cổng Thanh Toán Sandbox"**: Cho phép mở trang cổng thanh toán Sandbox trong tab mới hoặc chuyển hướng trực tiếp.
  - **Nút "Mô phỏng Thanh toán Thành công (Test Sandbox)"**: Cho phép người dùng và kiểm thử viên kích hoạt Webhook IPN giả lập thành công tức thì mà không cần ứng dụng ngân hàng thực tế.
  - **Tự động thăm dò trạng thái (Polling Fallback)**: Sau khi quét mã hoặc bấm mô phỏng, hệ thống tự động xác nhận đơn hàng thành công và chuyển hướng sang trang theo dõi đơn hàng `http://localhost:3000/orders/[id]`.

### 5.3 Nâng Cấp Modal Nạp Tiền Ví (`QuickTopupModal.tsx`)
- Tích hợp gọi API `POST /payment/gateway/create-url` khi nạp tiền qua VNPay / MoMo.
- Hiển thị QR thanh toán nạp tiền và cập nhật số dư ví tức thì khi nhận được Webhook hạch toán vào Sổ cái kép.

### 5.4 Trang Kết Quả Giao Dịch Cổng Thanh Toán (`/payment/return`)
- Tạo trang `frontend/src/app/payment/return/page.tsx` tiếp nhận các tham số callback từ VNPay Sandbox (`vnp_ResponseCode`, `vnp_TxnRef`, `vnp_Amount`, `vnp_BankCode`) và MoMo.
- Giao diện cao cấp hiển thị chi tiết biên lai giao dịch:
  - **Trạng thái thành công (`00`)**: Huy hiệu xanh ngọc bích, mã tham chiếu, ngân hàng xử lý, số tiền đã trừ.
  - **Trạng thái thất bại / Hủy**: Cảnh báo cam/đỏ, lý do giao dịch bị hủy và nút thử lại.
  - **Bộ đếm tự động điều hướng**: Đếm ngược 5 giây tự động đưa khách hàng về trang theo dõi đơn hàng hoặc trang ví.

---

## 6. Kịch Bản Kiểm Thử 3 Nhánh (Vitest Test Suite)

### 6.1 Backend Test Suite (`backend/apps/payment-service/src/modules/ledger/tests/payment-gateway-webhook.spec.ts`)
#### Nhánh 1: Luồng chuẩn thành công (Happy Path)
- **HP-01**: Tạo URL thanh toán VNPay thành công (đúng format tham số, chữ ký HMAC-SHA512 hợp lệ, có mã QR).
- **HP-02**: Tạo URL thanh toán MoMo thành công (đúng format tham số, chữ ký HMAC-SHA256 hợp lệ).
- **HP-03**: Xử lý Webhook VNPay thành công: xác thực đúng chữ ký số, nạp tiền ví thành công và hạch toán đúng sổ cái kép.
- **HP-04**: Xử lý Webhook MoMo thành công: xác thực chữ ký và hoàn tất giao dịch.

#### Nhánh 2: Các trường hợp biên (Edge Cases)
- **EC-01**: Webhook gửi trùng lặp nhiều lần (Idempotency check): lần thứ 2 trở đi không hạch toán thêm tiền, trả về `RspCode: 00` ngay lập tức.
- **EC-02**: Các tham số URL VNPay được sắp xếp bảng chữ cái (Alphabetical sorting) chuẩn trước khi hash chữ ký.
- **EC-03**: Giao dịch nạp số tiền lớn hoặc số tiền lẻ (ví dụ 10.000.000 VND).
- **EC-04**: Xử lý giao dịch VNPay trả về mã lỗi ngân hàng khách hủy (`vnp_ResponseCode !== '00'`) mà không làm hỏng dữ liệu sổ cái.

#### Nhánh 3: Luồng lỗi & Từ chối vi phạm (Error / Rejection Flow)
- **ERR-01**: Webhook gửi chữ ký số sai hoặc bị giả mạo -> ném `BadRequestException` hoặc từ chối phản hồi.
- **ERR-02**: Tạo URL thanh toán với phương thức không được hỗ trợ -> ném `BadRequestException`.
- **ERR-03**: Tạo URL thanh toán với số tiền âm hoặc bằng 0 -> ném `BadRequestException`.
- **ERR-04**: Ví nhận tiền không tồn tại trong hệ thống -> ném `NotFoundException`.
- **ERR-05**: Webhook thiếu các trường bắt buộc (`orderId`, `amount`, `signature`) -> từ chối xử lý.

### 6.2 Frontend Test Suite (`frontend/src/features/payment/tests/online-payment-gateway-ui.spec.ts`)
#### Nhánh 1: Luồng chuẩn thành công (Happy Path)
- **UI-HP-01**: Khách hàng chọn phương thức VNPay QR tại `/checkout`, bấm "Đặt hàng" mở thành công Modal QR Code thanh toán.
- **UI-HP-02**: Modal hiển thị đầy đủ mã QR, số tiền chính xác, mã đơn hàng và đếm ngược 15 phút.
- **UI-HP-03**: Bấm "Mô phỏng thanh toán thành công", hệ thống ghi nhận và chuyển hướng sang `/orders/[id]`.
- **UI-HP-04**: Trang `/payment/return` hiển thị đúng trạng thái giao dịch thành công khi nhận `vnp_ResponseCode=00`.

#### Nhánh 2: Các trường hợp biên (Edge Cases)
- **UI-EC-01**: Khách hàng đóng modal QR Code và mở lại từ đơn hàng mà không bị mất mã QR hoặc tạo đơn lặp.
- **UI-EC-02**: Hết thời gian đếm ngược 15 phút, giao diện hiển thị cảnh báo hết hạn và nút "Tạo lại mã thanh toán".

#### Nhánh 3: Luồng lỗi & Từ chối (Error Flow)
- **UI-ERR-01**: Khi người dùng hủy giao dịch tại cổng Sandbox, trang `/payment/return` hiển thị rõ thông báo giao dịch bị hủy và cung cấp nút "Thanh toán lại".

---

## 7. Bộ Tứ Kiểm Soát CI Nội Bộ (Local CI Gate)
1. **Linter**: `npm run lint` (Backend: oxlint 0 warnings/errors; Frontend: eslint 0 warnings/errors).
2. **Type Check**: `npx tsc --noEmit` (0 errors trên cả backend và frontend).
3. **Unit Tests**: `npm test` với Vitest (100% pass trên toàn bộ test suite).
4. **Build Check**: `npm run build` (Biên dịch thành công cả backend và frontend).
