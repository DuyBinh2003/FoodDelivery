import { Injectable, NotFoundException } from '@nestjs/common';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';

export interface UpdateDriverProfileCommand {
  userId: string;
  dto: UpdateDriverProfileDto;
}

@Injectable()
export class UpdateDriverProfileUseCase {
  constructor(
    private readonly userReadRepo: UserReadRepository,
    private readonly userWriteRepo: UserWriteRepository,
  ) {}

  async execute(command: UpdateDriverProfileCommand): Promise<DriverProfile> {
    const profile = await this.userReadRepo.getDriverProfile(command.userId);
    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }
    
    Object.assign(profile, command.dto);
    return this.userWriteRepo.saveDriverProfile(profile);
  }
}
