import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdempotencyService } from '@/common/idempotency/idempotency.service.js';
import { IdempotencyInterceptor } from '@/common/idempotency/idempotency.interceptor.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
