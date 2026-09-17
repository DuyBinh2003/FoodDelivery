import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';
import { RegisterDto } from '@/modules/auth/dto/auth.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository,
    @Inject(UserWriteRepository) private readonly userWriteRepo: UserWriteRepository,
  ) {}

  async execute(dto: RegisterDto) {
    const existingUser = await this.userReadRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    const user = await this.userWriteRepo.createUserWithProfile({
      email: dto.email,
      password_hash,
      role: dto.role,
      fullName: dto.fullName,
      phone: dto.phone,
    });

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
