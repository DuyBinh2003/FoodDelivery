import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { IdempotencyInterceptor, IdempotencyOptions } from '@/common/idempotency/idempotency.interceptor.js';

export const IDEMPOTENCY_OPTIONS_KEY = 'IDEMPOTENCY_OPTIONS_KEY';

export const UseIdempotency = (options?: IdempotencyOptions) => {
  return applyDecorators(
    SetMetadata(IDEMPOTENCY_OPTIONS_KEY, options || {}),
    UseInterceptors(IdempotencyInterceptor),
  );
};
