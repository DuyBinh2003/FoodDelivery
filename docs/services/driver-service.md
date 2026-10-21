# 🛵 Delivery Service (Driver & Real-time GPS Tracking)

Dịch vụ `delivery-service` (Port `3005`) chịu trách nhiệm định vị GPS thời gian thực của đối tác tài xế, tính toán khoảng cách đường chim bay (Haversine distance), ước lượng thời gian giao hàng (ETA), phát sóng WebSocket cho khách hàng theo dõi trực tiếp lộ trình đơn hàng và nhận thông báo phân phối cuốc xe qua Amazon SQS.

---

## 1. Thông Tin Kiến Trúc & Cổng Dịch Vụ

- **Service Name**: `delivery-service`
- **Port**: `3005`
- **Database Schema**: `schema_delivery` (PostgreSQL)
- **Cache & Real-time Store**: Redis (`driver:location:*`)
- **WebSocket Gateway**: `@WebSocketGateway({ namespace: 'delivery', cors: { origin: '*' } })`
- **Message Broker**: Amazon SQS (`driver-dispatch-queue`) & SNS Fanout

---

## 2. Danh Sách REST APIs

| Phương thức | Đường dẫn | Quyền hạn | Mục đích |
| :--- | :--- | :--- | :--- |
| `GET` | `/delivery/orders/:orderId/location` | Public / Khách hàng | Lấy tọa độ GPS mới nhất của tài xế đang giao đơn hàng. |
| `POST` | `/delivery/orders/:orderId/location` | Tài xế / Internal | Endpoint cập nhật vị trí GPS qua HTTP REST (Dự phòng cho WebSocket). |
| `POST` | `/delivery/estimate-distance` | Public / Client | Tính toán cự ly đường chim bay (km) và thời gian dự kiến giữa 2 tọa độ bất kỳ. |
| `GET` | `/delivery/chat/orders/:orderId/messages` | Khách / Tài xế / Quán | Lấy lịch sử tin nhắn của đơn hàng (hỗ trợ phân trang). |
| `POST` | `/delivery/chat/orders/:orderId/messages` | Khách / Tài xế / Quán | Gửi tin nhắn qua REST API (dự phòng WebSocket). |
| `POST` | `/delivery/chat/orders/:orderId/seen` | Khách / Tài xế / Quán | Đánh dấu đã đọc tin nhắn của đối phương. |
| `GET` | `/delivery/chat/quick-replies` | Public / Client | Lấy danh mục câu trả lời nhanh mẫu theo vai trò. |

### Chi tiết Request / Response mẫu

#### 1. Lấy vị trí GPS đơn hàng: `GET /delivery/orders/:orderId/location`
- **Response `200 OK`**:
```json
{
  "orderId": "6a9f8b2c-...",
  "driverId": "9b1c2d3e-...",
  "lat": 10.77452,
  "lng": 106.70185,
  "heading": 85,
  "speed": 28.5,
  "remaining_km": 1.2,
  "eta_minutes": 3,
  "updatedAt": "2026-10-19T13:00:00.000Z"
}
```

#### 2. Cập nhật vị trí GPS: `POST /delivery/orders/:orderId/location`
- **Request Body**:
```json
{
  "driverId": "9b1c2d3e-...",
  "lat": 10.77452,
  "lng": 106.70185,
  "heading": 85,
  "speed": 30,
  "dropoff_lat": 10.77653,
  "dropoff_lng": 106.70098
}
```

#### 3. Ước tính khoảng cách: `POST /delivery/estimate-distance`
- **Request Body**:
```json
{
  "origin_lat": 10.772545,
  "origin_lng": 106.702758,
  "destination_lat": 10.776530,
  "destination_lng": 106.700980
}
```
- **Response `200 OK`**:
```json
{
  "distance_km": 0.5,
  "estimated_duration_minutes": 2
}
```

---

## 3. Đặc Tả WebSocket Gateway (`/delivery`)

Gateway cung cấp kênh truyền thông hai chiều (Full-Duplex) với độ trễ thấp để khách hàng và tài xế đồng bộ tọa độ tức thì:

### A. Sự kiện Tiếp nhận (Client ➔ Server)
1. **`order:track`**:
   - **Payload**: `{ "orderId": "string" }`
   - **Hành động**: Đưa client vào room `order_<orderId>`, tự động gửi ngay sự kiện `driver:location_current` nếu trong Redis cache đã có tọa độ tài xế.
2. **`driver:update_location`**:
   - **Payload**:
     ```json
     {
       "orderId": "string",
       "driverId": "string",
       "lat": 10.77452,
       "lng": 106.70185,
       "heading": 85,
       "speed": 30,
       "dropoff_lat": 10.77653,
       "dropoff_lng": 106.70098
     }
     ```
   - **Hành động**: Tính `remaining_km` và `eta_minutes`, ghi đè vào Redis và phát sóng ngay lập tức tới toàn bộ client trong room `order_<orderId>`.

### B. Sự kiện Phát đi (Server ➔ Client)
1. **`driver:location_current`**: Trả về dữ liệu GPS tức thời cho khách hàng ngay khi vừa mở màn hình theo dõi đơn hàng.
2. **`driver:location_updated`**: Broadcast tọa độ GPS mới nhất kèm cự ly còn lại và ETA mỗi khi tài xế di chuyển.

### C. Sự kiện Kênh Chat Thời Gian Thực (In-App Order Chat)
- **Client ➔ Server**:
  - `chat:join` `{ orderId, userId, role }`: Tham gia phòng chat của đơn hàng (`chat_order_<orderId>`), trả về 50 tin nhắn gần nhất và quick replies.
  - `chat:send` `{ order_id, sender_id, sender_role, sender_name, content, message_type? }`: Gửi tin nhắn mới, lưu PostgreSQL `t_order_chat_message` và broadcast tới room (< 200ms).
  - `chat:mark_seen` `{ orderId, readerId }`: Đánh dấu đã đọc tin nhắn của đối phương và broadcast `chat:seen`.
  - `chat:typing` `{ orderId, userId, userName, role, isTyping }`: Phát trạng thái đang soạn tin nhắn tới các thành viên khác.
- **Server ➔ Client**:
  - `chat:joined`: Trả về dữ liệu lịch sử phòng chat, danh mục câu trả lời nhanh mẫu và trạng thái phòng.
  - `chat:new_message`: Phát sóng tin nhắn mới cho các bên liên quan trong đơn.
  - `chat:seen`: Cập nhật thời điểm đọc tin nhắn của đối phương.
  - `chat:typing`: Trạng thái đang gõ phím.

---

## 4. Chiến Lược Caching Redis (In-Memory Key Schema)

| Key Pattern | Cấu trúc dữ liệu | TTL | Mục đích |
| :--- | :--- | :---: | :--- |
| `driver:location:order:<orderId>` | JSON String | 3600s (1h) | Lưu vị trí GPS mới nhất của tài xế đang giao đơn hàng cụ thể. |
| `driver:location:driver:<driverId>` | JSON String | 3600s (1h) | Lưu vị trí GPS hiện tại của tài xế độc lập theo ID. |

---

## 5. Tương Tác SQS Consumer (Event-Driven Dispatch)

`DriversConsumer` liên tục lắng nghe hàng đợi SQS `driver-dispatch-queue` để nhận thông báo phân phối cuốc xe từ `order-service` khi đơn hàng chuyển sang trạng thái sẵn sàng giao (`ORDER_READY_FOR_PICKUP` hoặc `ORDER_ACCEPTED`).
