import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';

export interface DeleteUserAddressCommand {
  id: string;
  userId: string;
}

@Injectable()
export class DeleteUserAddressUseCase {
  constructor(
    @Inject(UserAddressRepository)
    private readonly addressRepo: UserAddressRepository,
  ) {}

  async execute(command: DeleteUserAddressCommand): Promise<{ success: boolean; message: string }> {
    const { id, userId } = command;
    const deleted = await this.addressRepo.softDelete(id, userId);
    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID: ${id}`);
    }

    return {
      success: true,
      message: 'Đã xóa địa chỉ thành công',
    };
  }
}
