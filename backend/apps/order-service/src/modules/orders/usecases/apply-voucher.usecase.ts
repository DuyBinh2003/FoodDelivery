import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ValidateVoucherUseCase } from '@/modules/orders/usecases/validate-voucher.usecase.js';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import type { VoucherUsage } from '@/modules/orders/entities/voucher-usage.entity.js';
import type { VoucherValidationResult } from '@/modules/orders/dto/voucher-response.dto.js';

export interface ApplyVoucherParams {
  code: string;
  order_id: string;
  customer_id: string;
  restaurant_id: string;
  subtotal: number;
  delivery_fee?: number;
  currentTime?: Date;
}

@Injectable()
export class ApplyVoucherUseCase {
  private readonly logger = new Logger(ApplyVoucherUseCase.name);

  constructor(
    private readonly validateUseCase: ValidateVoucherUseCase,
    private readonly voucherRepo: VoucherRepository,
  ) {}

  async execute(params: ApplyVoucherParams): Promise<{
    validation: VoucherValidationResult;
    usage: VoucherUsage;
  }> {
    const { code, order_id, customer_id, restaurant_id, subtotal, delivery_fee, currentTime } = params;

    const validation = await this.validateUseCase.execute({
      code,
      restaurant_id,
      subtotal,
      delivery_fee,
      customer_id,
      currentTime,
    });

    const isReserved = await this.voucherRepo.atomicIncrementUsedQuantity(validation.voucher.id);
    if (!isReserved) {
      throw new BadRequestException(`Rất tiếc, mã ưu đãi '${code}' vừa hết lượt do có nhiều khách cùng sử dụng.`);
    }

    try {
      const usage = await this.voucherRepo.createUsage({
        voucher_id: validation.voucher.id,
        order_id,
        customer_id,
        discount_amount: validation.discount_amount,
      });

      this.logger.log(
        `[VoucherApplied] Order ${order_id} applied voucher ${code} (-${validation.discount_amount} VND)`,
      );

      return {
        validation,
        usage,
      };
    } catch (error: unknown) {
      await this.voucherRepo.atomicDecrementUsedQuantity(validation.voucher.id);
      this.logger.error(`Failed to record voucher usage for order ${order_id}. Decremented back.`, {
        cause: error,
      });
      throw error;
    }
  }
}
