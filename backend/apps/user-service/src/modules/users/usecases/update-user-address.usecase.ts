import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';
import { UserAddress } from '@/modules/users/entities/user-address.entity.js';
import { UpdateAddressDto } from '@/modules/users/dto/address.dto.js';

export interface UpdateUserAddressCommand {
  id: string;
  userId: string;
  dto: UpdateAddressDto;
}

@Injectable()
export class UpdateUserAddressUseCase {
  constructor(
    @Inject(UserAddressRepository)
    private readonly addressRepo: UserAddressRepository,
  ) {}

  async execute(command: UpdateUserAddressCommand): Promise<UserAddress> {
    const { id, userId, dto } = command;

    if (dto.latitude !== undefined && (dto.latitude < -90 || dto.latitude > 90)) {
      throw new BadRequestException('Vĩ độ không hợp lệ (phải từ -90 đến 90)');
    }

    if (dto.longitude !== undefined && (dto.longitude < -180 || dto.longitude > 180)) {
      throw new BadRequestException('Kinh độ không hợp lệ (phải từ -180 đến 180)');
    }

    const updated = await this.addressRepo.update(id, userId, dto);
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID: ${id}`);
    }

    return updated;
  }
}
