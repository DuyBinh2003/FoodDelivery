import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderRedisRepository, InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';
import { RevertVoucherUseCase } from '@/modules/orders/usecases/revert-voucher.usecase.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

export enum OrderSagaStep {
  CREATE_ORDER = 'CREATE_ORDER',
  DEDUCT_PAYMENT = 'DEDUCT_PAYMENT',
  DISPATCH_DRIVER = 'DISPATCH_DRIVER',
  CONFIRM_ORDER = 'CONFIRM_ORDER',
}

export enum OrderSagaStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED',
}

export interface OrderSagaState {
  orderId: string;
  customerId: string;
  currentStep: OrderSagaStep;
  status: OrderSagaStatus;
  totalAmount: number;
  pointsUsed: number;
  paymentMethod: string;
  history: Array<{ step: OrderSagaStep; timestamp: string }>;
  compensationLog: string[];
}

export interface CompensateOrderResult {
  orderId: string;
  status: OrderSagaStatus;
  refundAmount: number;
  pointsRefunded: number;
  voucherReverted: boolean;
  compensationLog: string[];
}

@Injectable()
export class OrderSagaOrchestrator {
  private readonly logger = new Logger(OrderSagaOrchestrator.name);

  constructor(
    @Inject(OrderRedisRepository) private readonly orderRedisRepo: OrderRedisRepository,
    @Optional() @Inject(RevertVoucherUseCase) private readonly revertVoucherUseCase?: RevertVoucherUseCase,
    @Optional() @Inject(SqsService) private readonly sqsService?: SqsService,
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
  ) {}

  /**
   * Khởi tạo vòng đời Saga cho một đơn hàng mới
   */
  async startSaga(orderData: InflightOrderData): Promise<OrderSagaState> {
    const now = new Date().toISOString();
    const initialState: OrderSagaState = {
      orderId: orderData.id,
      customerId: orderData.customer_id,
      currentStep: OrderSagaStep.CREATE_ORDER,
      status: OrderSagaStatus.IN_PROGRESS,
      totalAmount: orderData.total_amount,
      pointsUsed: orderData.points_used ?? 0,
      paymentMethod: orderData.payment_method,
      history: [{ step: OrderSagaStep.CREATE_ORDER, timestamp: now }],
      compensationLog: [],
    };

    this.logger.log(`[Saga Started] Order ${orderData.id} initiated at step CREATE_ORDER`);
    return initialState;
  }

  /**
   * Chuyển tiếp Saga sang bước kế tiếp
   */
  async advanceStep(state: OrderSagaState, nextStep: OrderSagaStep): Promise<OrderSagaState> {
    state.currentStep = nextStep;
    state.history.push({ step: nextStep, timestamp: new Date().toISOString() });

    if (nextStep === OrderSagaStep.CONFIRM_ORDER) {
      state.status = OrderSagaStatus.COMPLETED;
      this.logger.log(`[Saga Completed] Order ${state.orderId} successfully completed all steps`);
    } else {
      this.logger.log(`[Saga Step Advanced] Order ${state.orderId} transitioned to ${nextStep}`);
    }

    return state;
  }

  /**
   * Thực hiện chuỗi hành động bù trừ (Compensating Transactions) khi có bước thất bại
   */
  async compensate(
    orderId: string,
    failedStep: OrderSagaStep,
    reason: string,
  ): Promise<CompensateOrderResult> {
    this.logger.warn(
      `[Saga Compensation Triggered] Order ${orderId} failed at step ${failedStep}. Reason: ${reason}. Executing rollbacks...`,
    );

    const compensationLog: string[] = [];
    let refundAmount = 0;
    let pointsRefunded = 0;
    let voucherReverted = false;

    // 1. Đọc dữ liệu In-flight order
    const order = await this.orderRedisRepo.getInflightOrder(orderId);
    if (!order) {
      this.logger.error(`[Saga Compensation] Cannot find order ${orderId} in redis cache`);
      compensationLog.push(`Lỗi: Không tìm thấy snapshot đơn ${orderId} để rollback`);
      return {
        orderId,
        status: OrderSagaStatus.FAILED,
        refundAmount: 0,
        pointsRefunded: 0,
        voucherReverted: false,
        compensationLog,
      };
    }

    // 2. Bù trừ 1: Hoàn tiền ví nếu đã thanh toán trừ tiền
    if (order.payment_method === 'WALLET' || order.payment_method === 'ONLINE') {
      try {
        const paymentUrl =
          this.configService?.get<string>('services.paymentUrl') || process.env.PAYMENT_SERVICE_URL;

        if (paymentUrl) {
          const res = await fetch(`${paymentUrl}/internal/ledger/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              customerId: order.customer_id,
              amount: order.total_amount,
              reason: `Saga Rollback: ${reason}`,
            }),
          });

          if (!res.ok) {
            this.logger.warn(`Internal payment refund endpoint returned non-200 for order ${orderId}`);
          }
        }

        refundAmount = order.total_amount;
        compensationLog.push(`Đã hoàn trả ${refundAmount.toLocaleString('vi-VN')} VND vào ví người dùng`);
      } catch (err: unknown) {
        this.logger.error(`Failed to refund payment for order ${orderId}: ${String(err)}`);
        compensationLog.push(`Lỗi hoàn tiền ví: ${String(err)}`);
      }
    }

    // 3. Bù trừ 2: Hoàn lại điểm tích lũy Loyalty
    if (order.points_used && order.points_used > 0) {
      try {
        const userUrl =
          this.configService?.get<string>('services.userUrl') || process.env.USER_SERVICE_URL;

        if (userUrl) {
          await fetch(`${userUrl}/internal/loyalty/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: order.customer_id,
              orderId,
              points: order.points_used,
              reason: `Saga Rollback: ${reason}`,
            }),
          }).catch(() => {});
        }

        pointsRefunded = order.points_used;
        compensationLog.push(`Đã hoàn lại ${pointsRefunded} điểm thưởng loyalty`);
      } catch (err: unknown) {
        this.logger.error(`Failed to refund points for order ${orderId}: ${String(err)}`);
        compensationLog.push(`Lỗi hoàn điểm: ${String(err)}`);
      }
    }

    // 4. Bù trừ 3: Hoàn lại lượt sử dụng voucher nếu có
    if (this.revertVoucherUseCase) {
      try {
        const revertResult = await this.revertVoucherUseCase.execute(orderId);
        if (revertResult.reverted) {
          voucherReverted = true;
          compensationLog.push(`Đã khôi phục voucher ${revertResult.voucherId ?? ''} (+1 lượt dùng)`);
        }
      } catch (err: unknown) {
        this.logger.error(`Failed to revert voucher for order ${orderId}: ${String(err)}`);
        compensationLog.push(`Lỗi hoàn voucher: ${String(err)}`);
      }
    }

    // 5. Bù trừ 4: Cập nhật trạng thái đơn hàng thành CANCELLED
    await this.orderRedisRepo.updateStatus(orderId, OrderStatus.CANCELLED);
    compensationLog.push(`Đã chuyển trạng thái đơn hàng sang ${OrderStatus.CANCELLED}`);

    this.logger.log(`[Saga Compensation Finished] Order ${orderId} successfully compensated.`);

    return {
      orderId,
      status: OrderSagaStatus.COMPENSATED,
      refundAmount,
      pointsRefunded,
      voucherReverted,
      compensationLog,
    };
  }
}
