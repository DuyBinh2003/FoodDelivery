import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import type { CreateVoucherDto } from '@/modules/orders/dto/create-voucher.dto.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

@Injectable()
export class CreateVoucherUseCase {
  private readonly logger = new Logger(CreateVoucherUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(dto: CreateVoucherDto): Promise<Voucher> {
    const existing = await this.voucherRepo.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Mã ưu đãi '${dto.code.toUpperCase()}' đã tồn tại trong hệ thống.`);
    }

    if (dto.sponsor_type === VoucherSponsor.MERCHANT && !dto.restaurant_id) {
      throw new BadRequestException('Voucher do Đối tác tài trợ bắt buộc phải gắn với restaurant_id cụ thể.');
    }

    const validFrom = new Date(dto.valid_from);
    const validTo = new Date(dto.valid_to);

    if (validFrom >= validTo) {
      throw new BadRequestException('Thời điểm bắt đầu có hiệu lực phải trước thời điểm kết thúc.');
    }

    if (
      dto.start_hour !== undefined &&
      dto.end_hour !== undefined &&
      dto.start_hour >= dto.end_hour
    ) {
      throw new BadRequestException('Khung giờ vàng bắt đầu phải nhỏ hơn khung giờ vàng kết thúc.');
    }

    return this.voucherRepo.createVoucher({
      ...dto,
      valid_from: validFrom,
      valid_to: validTo,
      min_order_amount: dto.min_order_amount ?? 0,
      max_usage_per_user: dto.max_usage_per_user ?? 1,
    });
  }
}
