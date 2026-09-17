import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { RegisterDto, LoginDto } from '@/modules/auth/dto/auth.dto.js';
import { LoginUseCase } from '@/modules/auth/usecases/login.usecase.js';
import { RegisterUseCase } from '@/modules/auth/usecases/register.usecase.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @Inject(RegisterUseCase) private readonly registerUseCase: RegisterUseCase,
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
}
