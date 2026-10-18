import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';
import { UserAddress } from '@/modules/users/entities/user-address.entity.js';

export interface SetDefaultAddressCommand {
  id: string;
  userId: string;
}

@Injectable()
export class SetDefaultAddressUseCase {
  constructor(
    @Inject(UserAddressRepository)
    private readonly addressRepo: UserAddressRepository,
  ) {}

  async execute(command: SetDefaultAddressCommand): Promise<UserAddress> {
    const { id, userId } = command;
    const address = await this.addressRepo.setDefault(id, userId);
    if (!address) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID: ${id}`);
    }

    return address;
  }
}
