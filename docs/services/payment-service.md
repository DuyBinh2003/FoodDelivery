# Payment Service (Core Payment & Ledger System)

Payment Service là dịch vụ cốt lõi quản lý dòng tiền, số dư ví người dùng (Customer), đối tác (Driver, Restaurant), và doanh thu nền tảng (Platform). Hệ thống hoạt động theo nguyên tắc kế toán kép (**Double-Entry Bookkeeping**) và **Append-Only Ledger**.

## 1. Cấu trúc Database (`schema_payment`)
- **`m_wallet_account`**: Danh mục tài khoản ví (Master) phân loại theo `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`.
- **`m_wallet_balance`**: Bảng snapshot số dư khả dụng (`available_balance`), số dư đóng băng (`locked_balance`) với `version` để kiểm soát concurrency.
- **`t_ledger_transaction`**: Nhật ký giao dịch sổ cái (Journal Header) chứa mã giao dịch, tham chiếu (`reference_type`, `reference_id`), và `idempotency_key`.
- **`t_ledger_entry`**: Dòng bút toán chi tiết (Append-Only Lines). Mỗi dòng ghi nhận `DEBIT` hoặc `CREDIT` với số dư sau giao dịch (`balance_after`).
- **`t_payment_intent`**: Ý định thanh toán cho đơn hàng (State machine quản lý trạng thái thanh toán).
- **`t_idempotency_key`**: Bảng lưu trữ và quản lý tính lũy đẳng chống duplicate charges.
- **`t_outbox`**: Transactional Outbox đảm bảo tính nhất quán giữa cơ sở dữ liệu và hàng đợi tin nhắn SNS/SQS.

## 2. Nguyên tắc Kế toán kép & Dòng tiền
- **Ràng buộc bất biến**: Mỗi giao dịch phải có ít nhất 2 bút toán và `Total DEBIT == Total CREDIT`.
- **Phương trình kế toán**:
  - `ASSET` / `EXPENSE`: DEBIT làm tăng số dư (+), CREDIT làm giảm số dư (-).
  - `LIABILITY` / `EQUITY` / `REVENUE`: CREDIT làm tăng số dư (+), DEBIT làm giảm số dư (-).
- **Chính sách Số dư âm (Negative Balance)**:
  - **Khách hàng (Customer)**: Tuyệt đối không được phép âm ví (`available_balance >= 0`). Nếu không đủ tiền hệ thống lập tức ném ngoại lệ `BadRequestException`.
  - **Tài xế (Driver)**: Đối với các đơn COD (tiền mặt), tài xế được phép âm ví ký quỹ tạm thời. Khi `available_balance < 0`, hệ thống gắn cờ cảnh báo `isDriverInactive = true` và chuyển tài xế sang trạng thái `INACTIVE` (không nhận thêm cuốc xe mới) cho đến khi nạp tiền bổ sung vào ví (Top-up).

## 3. API Endpoints

### 1. Khởi tạo Ví (`POST /wallets`)
- **Mô tả**: Tạo tài khoản ví mới cho khách hàng, tài xế hoặc nhà hàng.
- **Body**:
  - `ownerId`: UUID của chủ sở hữu
  - `ownerType`: `CUSTOMER` | `DRIVER` | `RESTAURANT` | `PLATFORM`
  - `accountCategory`: `ASSET` | `LIABILITY` | `EQUITY` | `REVENUE` | `EXPENSE`
  - `accountCode`: Mã định danh tài khoản duy nhất (VD: `WALLET_CUSTOMER_UUID`)
  - `currency`: Mặc định `VND`

### 2. Xem Số dư & Sao kê gần nhất (`GET /wallets/:id`)
- **Mô tả**: Tra cứu số dư khả dụng, số dư đóng băng và 20 bút toán gần nhất của ví.
- **Trả về**:
  - `wallet`: Thông tin tài khoản
  - `balance`: Số dư chi tiết
  - `recentEntries`: Danh sách các dòng bút toán
  - `isDriverInactive`: Boolean (chỉ định tài xế bị tạm khóa do âm ví)

### 3. Nạp tiền vào Ví (`POST /wallets/topup`)
- **Mô tả**: Nạp tiền vào ví trả trước của khách hoặc ví ký quỹ của tài xế.
- **Bút toán tự động**:
  - DEBIT `SYS_ASSET_GATEWAY_*` (Tài sản tiền mặt/ngân hàng của nền tảng tăng)
  - CREDIT `m_wallet_account` người nhận (Nợ phải trả của nền tảng tăng)
- **Body**:
  - `walletAccountId`: UUID của ví nhận tiền
  - `amount`: Số tiền nạp (VND)
  - `paymentMethod`: `VNPAY` | `MOMO` | `STRIPE` | `MOCK`
  - `referenceId`: Mã giao dịch nạp tiền
  - `idempotencyKey`: UUIDv4 chống nạp trùng lặp

### 4. Ghi nhận Giao dịch Sổ cái Kép (`POST /ledger/transactions`)
- **Mô tả**: Ghi nhận một giao dịch tài chính nhiều bên (VD: cấn trừ đơn hàng, chia tiền ship, thu phí nền tảng).
- **Body**:
  - `transactionCode`: Mã giao dịch duy nhất
  - `referenceType`: `ORDER_SETTLEMENT` | `COD_DEDUCTION` | `WITHDRAWAL` | `REFUND`
  - `referenceId`: ID của đơn hàng hoặc lệnh rút
  - `description`: Diễn giải giao dịch
  - `idempotencyKey`: Khóa lũy đẳng
  - `entries`: Mảng các bút toán (`walletAccountId`, `entryType`, `amount`)
- **Validation**: Tự động chặn nếu `sum(DEBIT) != sum(CREDIT)` hoặc amount <= 0.
