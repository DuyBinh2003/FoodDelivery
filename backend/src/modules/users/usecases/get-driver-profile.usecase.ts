import { Injectable, NotFoundException } from '@nestjs/common';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';

export interface GetDriverProfileQuery {
  userId: string;
}

@Injectable()
export class GetDriverProfileUseCase {
  constructor(private readonly userReadRepo: UserReadRepository) {}

  async execute(query: GetDriverProfileQuery): Promise<DriverProfile> {
    const profile = await this.userReadRepo.getDriverProfile(query.userId);
    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }
    return profile;
  }
}
