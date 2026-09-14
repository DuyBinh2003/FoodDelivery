# Driver Service

Driver Service chịu trách nhiệm xử lý logic gán tài xế cho đơn hàng. 
Trong mô hình Event-Driven của FoodDelivery, Driver Service không được gọi trực tiếp bằng REST API khi tạo đơn, mà sẽ hoạt động như một Worker (Consumer) lắng nghe Message Queue (Amazon SQS).

## Cơ chế hoạt động
1. Order Service đẩy event `ORDER_CREATED` lên SQS.
2. `DriversService` trong NestJS sử dụng `sqs-consumer` để liên tục polling các message từ SQS.
3. Khi nhận được message có type `ORDER_CREATED`:
   - Phân tích JSON body để lấy `orderId` và `restaurantId`.
   - Giả lập (mock) quá trình tìm kiếm tài xế gần nhất mất 3 giây.
   - Gọi cập nhật trạng thái đơn hàng (sử dụng internal call thông qua `OrdersService` sang trạng thái `ACCEPTED`).

## Cấu hình LocalStack
Để test Driver Service trên local, dự án sử dụng LocalStack thông qua file `docker-compose.yml`. Queue URL và credentials được nạp từ biến môi trường của NestJS (`SQS_ENDPOINT`, `SQS_QUEUE_URL`, v.v...).
