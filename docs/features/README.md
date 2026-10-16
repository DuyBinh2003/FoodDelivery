# 📱 Features & User Flows (Đặc Tả Tính Năng)

Thư mục này chứa toàn bộ các đặc tả tính năng và luồng tương tác của người dùng cuối (User Journeys / Interactive Flows) trên hệ thống **Food Delivery**.

Các tính năng được phân nhóm theo từng đối tượng người dùng (Actor-based hierarchy) để thuận tiện cho việc phát triển giao diện (Frontend), nghiệp vụ (Backend) và kiểm thử (QA).

---

## 👥 Phân Cấp Tính Năng Theo Đối Tượng

```
docs/features/
├── README.md                          # Mục lục tính năng (Bạn đang ở đây)
│
├── customer/                          # 🛒 Phân hệ Khách Hàng (Customer App)
│   └── advanced-cart.md               # Hệ thống giỏ hàng: chính sách 1 nhà hàng, auto revalidation, toppings
│
├── partner/                           # 🏪 Phân hệ Đối Tác Nhà Hàng (Merchant Portal)
│   ├── merchant-partner-portal.md     # Quản lý quán ăn: mở/đóng cửa thời gian thực, quản lý menu & danh mục
│   └── restaurant-registration-flow.md# Luồng nộp đơn mở quán, xét duyệt tự động, WebSocket thông báo
│
└── driver/                            # 🛵 Phân hệ Đối Tác Tài Xế (Driver App & Portal)
    ├── driver-portal.md               # Dashboard tài xế: Online/Offline switch, cuốc xe, thu nhập & review
    └── driver-registration-flow.md    # Luồng đăng ký tài xế, quy tắc 1-1 không trùng lặp, phê duyệt Admin
```

---

## 📑 Bảng Chi Tiết Tính Năng

### 1. Phân hệ Khách hàng (`customer/`)
| Tính năng | Đường dẫn ứng dụng | Mô tả cốt lõi | Tài liệu |
| :--- | :--- | :--- | :--- |
| **Giỏ hàng nâng cao (Advanced Cart)** | `/cart`, `/checkout` | Lưu giỏ hàng offline-first, tự động cập nhật giá và kiểm tra mở/đóng cửa khi thanh toán, bắt buộc 1 nhà hàng duy nhất. | [`advanced-cart.md`](./customer/advanced-cart.md) |

### 2. Phân hệ Đối tác Nhà hàng (`partner/`)
| Tính năng | Đường dẫn ứng dụng | Mô tả cốt lõi | Tài liệu |
| :--- | :--- | :--- | :--- |
| **Cổng Đối Tác (Merchant Portal)** | `/partner/restaurant` | Bật/tắt mở quán (`is_active`), quản lý món ăn (giá, ảnh, tags, category), chặn đặt món khi quán nghỉ. | [`merchant-partner-portal.md`](./partner/merchant-partner-portal.md) |
| **Đăng ký Mở Quán** | `/register/restaurant` | Nộp hồ sơ kinh doanh, bắn sự kiện SNS/SQS sang Admin, cập nhật trạng thái hồ sơ thời gian thực. | [`restaurant-registration-flow.md`](./partner/restaurant-registration-flow.md) |

### 3. Phân hệ Đối tác Tài xế (`driver/`)
| Tính năng | Đường dẫn ứng dụng | Mô tả cốt lõi | Tài liệu |
| :--- | :--- | :--- | :--- |
| **Cổng Thông Tin Tài Xế (Driver Portal)** | `/driver/dashboard` | Bật/tắt trạng thái nhận cuốc, thống kê thu nhập ngày/tuần, lịch sử cuốc xe chi tiết và xem đánh giá khách hàng. | [`driver-portal.md`](./driver/driver-portal.md) |
| **Đăng ký Tài Xế** | `/register/driver` | Form đăng ký phương tiện & CCCD, ràng buộc 1 tài khoản chỉ 1 tài xế, quản trị viên phê duyệt trên Admin Portal. | [`driver-registration-flow.md`](./driver/driver-registration-flow.md) |

---

> [!TIP]
> Khi phát triển một tính năng mới cho giao diện người dùng, hãy xác định đối tượng người dùng chính (Customer, Partner, Driver, hoặc Admin) và tạo file đặc tả mới trong thư mục con tương ứng.
