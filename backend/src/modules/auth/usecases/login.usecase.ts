import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { LoginDto } from '@/modules/auth/dto/auth.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.userReadRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }
}
