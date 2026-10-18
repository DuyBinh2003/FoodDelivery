import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';
import { UserAddress } from '@/modules/users/entities/user-address.entity.js';
import { CreateAddressDto } from '@/modules/users/dto/address.dto.js';

export interface CreateUserAddressCommand {
  userId: string;
  dto: CreateAddressDto;
}

@Injectable()
export class CreateUserAddressUseCase {
  constructor(
    @Inject(UserAddressRepository)
    private readonly addressRepo: UserAddressRepository,
  ) {}

  async execute(command: CreateUserAddressCommand): Promise<UserAddress> {
    const { userId, dto } = command;

    if (dto.latitude < -90 || dto.latitude > 90) {
      throw new BadRequestException('Vĩ độ không hợp lệ (phải từ -90 đến 90)');
    }

    if (dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Kinh độ không hợp lệ (phải từ -180 đến 180)');
    }

    return this.addressRepo.create(userId, dto);
  }
}
