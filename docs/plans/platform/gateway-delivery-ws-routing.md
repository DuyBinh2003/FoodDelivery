# 📋 Kế Hoạch Triển Khai: Cấu Hình API Gateway Định Tuyến Delivery Service, WebSocket Proxy & Rate Limiting

`[COMPLETED]` • **Issue liên kết:** [#72](https://github.com/DuyBinh2003/FoodDelivery/issues/72) • **Phân loại:** `platform` • **Ngày khởi tạo:** 2026-10-21

---

## 1. 🎯 Tổng Quan & Mục Tiêu

### 1.1. Hiện trạng & Vấn đề
- Hệ thống Microservices hiện đang vận hành 7 services độc lập. Tuy nhiên, trong cấu hình API Gateway ([`gateway/nginx.conf`](file:///d:/code/FoodDelivery/gateway/nginx.conf)):
  - Chưa khai báo `upstream delivery_service` (port 3005).
  - Chưa định tuyến các route nghiệp vụ giao nhận: `/delivery/`, `/dispatch/`, `/tracking/`.
  - Chưa cấu hình WebSocket Proxy (`Upgrade`, `Connection "Upgrade"`) cho Socket.io connection của Delivery Tracking.
  - `docker-compose.yml`: Container `api-gateway` chưa khai báo `depends_on: delivery-service`.
  - Chưa có cơ chế Rate Limiting trên Gateway để bảo vệ các endpoints nhạy cảm (như Auth, Payment).

### 1.2. Mục tiêu đạt được
1. Bổ sung `upstream delivery_service` trỏ đến `delivery-service:3005`.
2. Định tuyến toàn bộ HTTP request giao nhận (`/delivery/`, `/dispatch/`, `/tracking/`) qua Gateway port 3000.
3. Hỗ trợ kết nối WebSocket hai chiều cho Socket.io với buffer & timeout tối ưu.
4. Thiết lập tầng Rate Limiting (chống DDoS / Spam request) qua `ngx_http_limit_req_module`.
5. Đảm bảo cấu hình NGINX hợp lệ và cập nhật đồng bộ tài liệu kiến trúc.

---

## 2. 🔍 Khảo Sát Hiện Trạng Codebase

| File / Component | Hiện trạng | Hành động cần thực hiện |
| :--- | :--- | :--- |
| [`gateway/nginx.conf`](file:///d:/code/FoodDelivery/gateway/nginx.conf) | Đã có upstream cho 6 services, thiếu `delivery_service` và cấu hình WebSocket. | Khai báo upstream, thêm location `/delivery/`, `/dispatch/`, cấu hình WebSocket upgrade và `limit_req_zone`. |
| [`docker-compose.yml`](file:///d:/code/FoodDelivery/docker-compose.yml) | `api-gateway` `depends_on` thiếu `delivery-service`. | Bổ sung `delivery-service` vào danh sách `depends_on` của `api-gateway`. |
| [`backend/apps/delivery-service`](file:///d:/code/FoodDelivery/backend/apps/delivery-service) | TrackingGateway listen port 3005, prefix namespace `/delivery`. | Gateway proxy chuyển tiếp đúng namespace và header. |

---

## 3. 🛠️ Thiết Kế Chi Tiết

### 3.1. Cấu hình Upstream & WebSocket trong `gateway/nginx.conf`
```nginx
upstream delivery_service {
    server delivery-service:3005;
}

# Rate limit zone: 10MB lưu được ~160,000 IP states, giới hạn 50 req/s cho toàn sàn và 10 req/s cho auth
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;

# WebSocket map header
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### 3.2. Định tuyến Route cho Delivery Service
```nginx
# Delivery HTTP APIs
location /delivery/ {
    limit_req zone=general_limit burst=20 nodelay;
    proxy_pass http://delivery_service/delivery/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /dispatch/ {
    limit_req zone=general_limit burst=20 nodelay;
    proxy_pass http://delivery_service/dispatch/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# WebSocket Tracking (Socket.io)
location /socket.io/ {
    proxy_pass http://delivery_service/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

---

## 4. 📂 Danh Sách File Tác Động (Impacted Files Matrix)

| Đường dẫn file | Thao tác | Mô tả thay đổi |
| :--- | :---: | :--- |
| `gateway/nginx.conf` | `MODIFY` | Khai báo upstream, rate limit zone, delivery locations và WebSocket upgrade. |
| `docker-compose.yml` | `MODIFY` | Thêm dependency `delivery-service` cho `api-gateway`. |
| `docs/plans/README.md` | `MODIFY` | Cập nhật Bảng tra cứu kế hoạch với Task #72. |
| `docs/architecture/system-architecture.md` | `MODIFY` | Bổ sung sơ đồ cổng Gateway hoàn thiện cả 7 services. |

---

## 5. 🧪 Kịch Bản Kiểm Thử 3 Nhánh (Testing Checklist)

### 🌿 Nhánh 1: Happy Path (Kịch bản chuẩn)
- [ ] **HP-01**: Gửi HTTP GET `/delivery/health` (hoặc `/dispatch/status`) qua Gateway port 3000 $\rightarrow$ Trả về HTTP 200/404 từ đúng `delivery-service`.
- [ ] **HP-02**: Client Socket.io bắt tay (handshake) qua `ws://localhost:3000/socket.io/?EIO=4&transport=websocket` $\rightarrow$ Kết nối WebSocket thành công, nhận pong định kỳ.
- [ ] **HP-03**: Truy cập các services khác (`/users/`, `/restaurants/`, `/orders/`) vẫn hoạt động bình thường, không bị ảnh hưởng.

### ⚠️ Nhánh 2: Edge Cases (Biên & Tải)
- [ ] **EC-01**: Client gửi liên tiếp 15 request đến `/auth/login` trong 1 giây $\rightarrow$ Các request trong ngưỡng `burst` được phục vụ, các request vượt ngưỡng trả về `HTTP 429 Too Many Requests`.
- [ ] **EC-02**: Kết nối WebSocket kéo dài nhiều giờ $\rightarrow$ Timeout 86400s đảm bảo kết nối không bị NGINX ngắt đột ngột giữa chừng.

### 🛑 Nhánh 3: Error / Security Flow (Xử lý lỗi & Bảo mật)
- [ ] **EF-01**: Cố gắng truy cập `/delivery/internal/*` qua Gateway $\rightarrow$ Bị chặn ngay lập tức với `HTTP 403 Forbidden` theo rule chặn internal API.
- [ ] **EF-02**: Khi `delivery-service` tạm thời khởi động lại $\rightarrow$ Gateway trả về `HTTP 502 Bad Gateway` an toàn, không rò rỉ stack trace hạ tầng.

---

## 6. 🏁 Local CI Gate & Tiêu Chí Nghiệm Thu

1. **Syntax Check**: `docker compose config` hợp lệ, không lỗi cú pháp yaml.
2. **NGINX Config Test**: File `nginx.conf` pass syntax validation.
3. **Local CI Gate**:
   - `npm run lint` trên toàn bộ codebase: 0 errors, 0 warnings.
   - `npx tsc --noEmit`: 0 errors.
   - `npm test`: 100% pass.
