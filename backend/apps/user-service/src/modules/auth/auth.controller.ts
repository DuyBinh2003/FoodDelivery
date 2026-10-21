import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RegisterDto, LoginDto } from '@/modules/auth/dto/auth.dto.js';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto.js';
import { LogoutDto } from '@/modules/auth/dto/logout.dto.js';
import { LoginUseCase } from '@/modules/auth/usecases/login.usecase.js';
import { RegisterUseCase } from '@/modules/auth/usecases/register.usecase.js';
import { RefreshTokenUseCase } from '@/modules/auth/usecases/refresh-token.usecase.js';
import { LogoutUseCase } from '@/modules/auth/usecases/logout.usecase.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @Inject(RegisterUseCase) private readonly registerUseCase: RegisterUseCase,
    @Inject(RefreshTokenUseCase) private readonly refreshTokenUseCase: RefreshTokenUseCase,
    @Inject(LogoutUseCase) private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Body() dto: LogoutDto,
  ) {
    const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    return this.logoutUseCase.execute(user.id, rawToken, dto?.refresh_token);
  }
}
