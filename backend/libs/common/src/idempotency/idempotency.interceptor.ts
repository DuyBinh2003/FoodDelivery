import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
  Optional,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IdempotencyService } from '@/common/idempotency/idempotency.service.js';
import { IDEMPOTENCY_OPTIONS_KEY } from '@/common/idempotency/idempotency.decorator.js';

export interface IdempotencyOptions {
  lockTtlSeconds?: number;
  cacheTtlSeconds?: number;
  headerName?: string;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService,
    @Optional() private readonly reflector?: Reflector,
    private readonly manualOptions?: IdempotencyOptions,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method?: string;
    }>();
    const response = httpContext.getResponse<{
      setHeader: (name: string, value: string) => void;
      status: (code: number) => void;
      statusCode?: number;
    }>();

    const decoratorOptions = this.reflector?.get<IdempotencyOptions>(
      IDEMPOTENCY_OPTIONS_KEY,
      context.getHandler(),
    );
    const options = decoratorOptions || this.manualOptions;

    const headerKey = options?.headerName?.toLowerCase() || 'idempotency-key';
    const rawHeader = request.headers[headerKey] || request.headers['x-idempotency-key'];

    // Nếu không truyền Idempotency-Key thì bỏ qua, chạy bình thường
    if (!rawHeader) {
      return next.handle();
    }

    const idempotencyKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key không hợp lệ');
    }

    if (idempotencyKey.length > 128) {
      throw new BadRequestException('Idempotency-Key vượt quá độ dài tối đa cho phép (128 ký tự)');
    }

    const sanitizedKey = idempotencyKey.trim();
    const lockTtl = options?.lockTtlSeconds ?? 120;
    const cacheTtl = options?.cacheTtlSeconds ?? 86400;

    const lockResult = await this.idempotencyService.acquireLock(sanitizedKey, lockTtl);

    // TH1: Đã có cached response trước đó (Replay)
    if (lockResult.cachedResponse) {
      response.setHeader('X-Idempotent-Replay', 'true');
      response.setHeader('X-Cache-Lookup', 'HIT');
      response.status(lockResult.cachedResponse.statusCode);
      return of(lockResult.cachedResponse.body);
    }

    // TH2: Request đang được xử lý đồng thời bởi tiến trình khác
    if (!lockResult.acquired) {
      throw new ConflictException('Giao dịch đang được xử lý, vui lòng không gửi yêu cầu trùng lặp');
    }

    // TH3: Giành được lock, tiếp tục thực thi và lưu kết quả
    return next.handle().pipe(
      tap({
        next: async (data: unknown) => {
          const statusCode = response.statusCode || 200;
          await this.idempotencyService.saveResponse(sanitizedKey, statusCode, data, cacheTtl);
        },
        error: async () => {
          // Giải phóng lock khi phát sinh ngoại lệ để cho phép thử lại
          await this.idempotencyService.releaseLock(sanitizedKey);
        },
      }),
    );
  }
}
