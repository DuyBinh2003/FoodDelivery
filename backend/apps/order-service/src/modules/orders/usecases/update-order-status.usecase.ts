import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { SnsService } from '@/common/messaging/sns.service.js';
import { OrderEventTypes } from '@/events/index.js';

export interface UpdateOrderStatusCommand {
  orderId: string;
  dto: UpdateOrderStatusDto;
  changedBy?: string;
}

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(OrderRedisRepository) private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository) private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderWriteRepository) private readonly orderWriteRepo: OrderWriteRepository,
    @Inject(SqsService) private readonly sqsService: SqsService,
    @Inject(SnsService) private readonly snsService: SnsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async execute(command: UpdateOrderStatusCommand): Promise<Order> {
    const newStatus = command.dto.status;

    // 1. Kiểm tra đơn hàng trong Redis In-flight Cache trước
    const inflight = await this.orderRedisRepo.getInflightOrder(command.orderId);

    if (inflight) {
      const previousStatus = inflight.status;
      await this.orderRedisRepo.updateStatus(command.orderId, newStatus);

      let resultOrder: Order | null = null;

      // KHI HOÀN THÀNH (COMPLETED): Thực hiện lưu DB Transaction vĩnh viễn (Deferred Persistence)
      if (newStatus === OrderStatus.COMPLETED) {
        resultOrder = await this.orderWriteRepo.persistCompletedOrder({
          ...inflight,
          status: OrderStatus.COMPLETED,
        });
        // Giữ TTL 30 phút trong Redis để tra cứu nhanh rồi tự hủy
        await this.orderRedisRepo.setTtl(command.orderId, 1800);
      } else if (newStatus === OrderStatus.CANCELLED) {
        // ĐƠN BỊ HỦY: Nếu đã thanh toán qua ví/thẻ thì lưu DB để đối soát hoàn tiền
        if (inflight.payment_method !== 'COD') {
          resultOrder = await this.orderWriteRepo.persistCompletedOrder({
            ...inflight,
            status: OrderStatus.CANCELLED,
          });
          await this.orderRedisRepo.setTtl(command.orderId, 900);
        } else {
          // Chưa thanh toán -> chỉ expire trên Redis, không lưu DB
          await this.orderRedisRepo.setTtl(command.orderId, 900);
        }
      }

      // KHI NHÀ HÀNG XÁC NHẬN (ACCEPTED): Bắn SNS Fanout cho các tài xế
      if (newStatus === OrderStatus.ACCEPTED) {
        const topicArn =
          this.configService.get<string>('sns.orderDriverDispatchTopic') ||
          'arn:aws:sns:ap-southeast-1:000000000000:order-driver-dispatch';

        await this.snsService.publishEvent(topicArn, OrderEventTypes.ORDER_ACCEPTED, {
          orderId: inflight.id,
          restaurantId: inflight.restaurant_id,
          customerId: inflight.customer_id,
          totalAmount: inflight.total_amount,
          deliveryAddress: inflight.delivery_address,
        });
      }

      // Phát sự kiện ORDER_STATUS_CHANGED vào SQS để các service khác (notification, logging) nhận
      await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
        orderId: inflight.id,
        previousStatus,
        newStatus,
        changedAt: new Date().toISOString(),
        changedBy: command.changedBy,
      });

      if (resultOrder) {
        return resultOrder;
      }

      // Trả về view giả lập từ snapshot nếu chưa ghi DB
      return {
        id: inflight.id,
        customer_id: inflight.customer_id,
        restaurant_id: inflight.restaurant_id,
        driver_id: inflight.driver_id,
        total_amount: inflight.total_amount,
        status: newStatus,
        delivery_address: inflight.delivery_address,
        note: inflight.note,
        estimated_delivery_time: null,
        payment_method: inflight.payment_method,
        created_at: new Date(inflight.created_at),
        updated_at: new Date(),
        is_deleted: false,
        items: inflight.items as any,
      } as unknown as Order;
    }

    // 2. Fallback: Nếu không có trong Redis, cập nhật trực tiếp trong PostgreSQL (đơn đã ở DB từ trước)
    const order = await this.orderReadRepo.findById(command.orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${command.orderId} not found`);
    }

    const previousStatus = order.status;
    order.status = newStatus;
    const saved = await this.orderWriteRepo.save(order);

    await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
      orderId: saved.id,
      previousStatus,
      newStatus: saved.status,
      changedAt: new Date().toISOString(),
      changedBy: command.changedBy,
    });

    return saved;
  }
}
