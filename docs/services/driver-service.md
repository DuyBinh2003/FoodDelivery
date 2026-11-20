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
| `POST` | `/delivery/stacking/evaluate` | Internal / Dispatch | Đánh giá tính khả thi gom 2 đơn (cự ly quán $\le 800m$, góc lệch $\le 45^\circ$, detour $\le 2.5km$). |
| `POST` | `/delivery/stacking/optimize-route` | Internal / Dispatch | Tối ưu thứ tự 4 chặng dừng (P1 -> P2 -> D_near -> D_far). |
| `POST` | `/delivery/stacking/create` | Internal / Dispatch | Tạo chuyến đi ghép cuốc mới cho tài xế. |
| `GET` | `/delivery/stacking/drivers/:driverId/current` | Tài xế / Dispatch | Lấy chuyến ghép đang hoạt động của tài xế. |
| `PATCH` | `/delivery/stacking/:tripId/next-waypoint` | Tài xế | Hoàn thành chặng dừng tiếp theo và chuyển trạng thái chuyến đi. |

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

---

## 4. Chiến Lược Caching Redis (In-Memory Key Schema)

| Key Pattern | Cấu trúc dữ liệu | TTL | Mục đích |
| :--- | :--- | :---: | :--- |
| `driver:location:order:<orderId>` | JSON String | 3600s (1h) | Lưu vị trí GPS mới nhất của tài xế đang giao đơn hàng cụ thể. |
| `driver:location:driver:<driverId>` | JSON String | 3600s (1h) | Lưu vị trí GPS hiện tại của tài xế độc lập theo ID. |

---

## 5. Tương Tác SQS Consumer (Event-Driven Dispatch)

`DriversConsumer` liên tục lắng nghe hàng đợi SQS `driver-dispatch-queue` để nhận thông báo phân phối cuốc xe từ `order-service` khi đơn hàng chuyển sang trạng thái sẵn sàng giao (`ORDER_READY_FOR_PICKUP` hoặc `ORDER_ACCEPTED`).
 
---

## 6. Thuật Toán Gom Đơn / Ghép Cuốc (Order Stacking Engine)

Order Stacking Engine giúp tài xế tăng thu nhập và tối ưu chi phí vận hành bằng cách ghép tối đa 2 đơn hàng có cùng hướng di chuyển và điểm lấy hàng gần nhau.

### A. Tiêu chí Đánh giá Khả thi (Stacking Constraints)
1. **Khoảng cách 2 điểm lấy hàng (Pickups)**: $\le 800\text{ m}$ (Haversine).
2. **Góc lệch hướng di chuyển (Bearing Delta)**: $\le 45^\circ$ giữa vector `P1 -> D1` và vector `P1 -> D2`.
3. **Quãng đường phát sinh thêm (Detour Distance)**: $\le 2.5\text{ km}$ so với tuyến đường đơn gốc.

### B. Tối ưu Thứ tự Lộ trình 4 Chặng Dừng
Quy tắc gom đơn luôn đảm bảo nhận cả 2 đơn trước khi giao để thức ăn được giữ ấm tối đa:
- **Chặng 0**: Lấy đơn 1 tại Nhà hàng 1 ($P_1$)
- **Chặng 1**: Lấy đơn 2 tại Nhà hàng 2 ($P_2$)
- **Chặng 2**: Giao đơn gần hơn ($D_{\text{near}}$) giữa $D_1$ và $D_2$
- **Chặng 3**: Giao đơn xa hơn ($D_{\text{far}}$) còn lại

### C. Công thức Tính Thưởng Ghép Cuốc (Stacking Bonus)
$$\text{Stacking Bonus} = 15,000\text{ VND} + (\text{Detour KM} \times 4,000\text{ VND})$$

### D. Bảng Dữ Liệu `schema_delivery.t_stacked_trip`
- `id`: UUID (Khóa chính)
- `driver_id`: UUID
- `primary_order_id`: UUID
- `secondary_order_id`: UUID
- `status`: `ACTIVE`, `COMPLETED`, `CANCELLED`
- `waypoints`: JSONB (Mảng 4 chặng dừng `orderId`, `type`, `lat`, `lng`, `sequence`, `completed`)
- `current_waypoint_index`: Integer (0-3)
- `original_distance_km`: Numeric
- `stacked_distance_km`: Numeric
- `detour_distance_km`: Numeric
- `driver_bonus_amount`: Numeric
- `created_at`, `updated_at`: Timestamp

