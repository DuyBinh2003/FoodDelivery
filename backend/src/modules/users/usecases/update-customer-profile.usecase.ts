import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { UpdateCustomerProfileDto } from '@/modules/users/dto/profile.dto.js';

export interface UpdateCustomerProfileCommand {
  userId: string;
  dto: UpdateCustomerProfileDto;
}

@Injectable()
export class UpdateCustomerProfileUseCase {
  constructor(
    @Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository,
    @Inject(UserWriteRepository) private readonly userWriteRepo: UserWriteRepository,
  ) {}

  async execute(command: UpdateCustomerProfileCommand): Promise<CustomerProfile> {
    const profile = await this.userReadRepo.getCustomerProfile(command.userId);
    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }
    
    Object.assign(profile, command.dto);
    return this.userWriteRepo.saveCustomerProfile(profile);
  }
}
