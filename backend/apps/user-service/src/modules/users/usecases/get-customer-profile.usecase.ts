import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';

export interface GetCustomerProfileQuery {
  userId: string;
}

@Injectable()
export class GetCustomerProfileUseCase {
  constructor(@Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository) { }

  async execute(query: GetCustomerProfileQuery): Promise<CustomerProfile> {
    const profile = await this.userReadRepo.getCustomerProfile(query.userId);
    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }
    return profile;
  }
}
