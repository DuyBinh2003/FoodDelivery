import { Injectable, Inject } from '@nestjs/common';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';
import { UserAddress } from '@/modules/users/entities/user-address.entity.js';

export interface GetUserAddressesQuery {
  userId: string;
}

@Injectable()
export class GetUserAddressesUseCase {
  constructor(
    @Inject(UserAddressRepository)
    private readonly addressRepo: UserAddressRepository,
  ) {}

  async execute(query: GetUserAddressesQuery): Promise<UserAddress[]> {
    return this.addressRepo.findUserAddresses(query.userId);
  }
}
