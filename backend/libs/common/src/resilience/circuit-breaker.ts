import { Logger, ServiceUnavailableException } from '@nestjs/common';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions<T = unknown> {
  name?: string;
  failureThreshold?: number; // Số lần lỗi liên tiếp để mở mạch (default: 5)
  resetTimeoutMs?: number; // Thời gian chờ trước khi thử lại (default: 10.000ms)
  halfOpenSuccessThreshold?: number; // Số lần thành công liên tiếp ở HALF_OPEN để đóng mạch (default: 2)
  fallback?: (error?: unknown) => Promise<T> | T;
}

export class CircuitBreaker<T = unknown> {
  private readonly logger: Logger;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private consecutiveSuccesses = 0;
  private nextAttemptTime = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly fallback?: (error?: unknown) => Promise<T> | T;
  public readonly name: string;

  constructor(options: CircuitBreakerOptions<T> = {}) {
    this.name = options.name || 'DefaultCircuitBreaker';
    this.logger = new Logger(`CircuitBreaker[${this.name}]`);
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
    this.fallback = options.fallback;
  }

  getState(): CircuitBreakerState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
      this.consecutiveSuccesses = 0;
      this.logger.log(`Trạng thái mạch chuyển sang: HALF_OPEN (Canary mode)`);
    }
    return this.state;
  }

  async execute(action: () => Promise<T>, customFallback?: (error?: unknown) => Promise<T> | T): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      this.logger.warn(`Mạch đang OPEN, từ chối request và chuyển sang Graceful Fallback`);
      return this.handleFallback(
        new ServiceUnavailableException(`Hệ thống ${this.name} tạm thời quá tải. Mạch Circuit Breaker đang OPEN.`),
        customFallback,
      );
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error: unknown) {
      this.recordFailure(error);
      return this.handleFallback(error, customFallback);
    }
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      this.logger.log(`Canary thành công (${this.consecutiveSuccesses}/${this.halfOpenSuccessThreshold})`);
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.reset();
        this.logger.log(`Mạch đã tự phục hồi thành công! Trạng thái: CLOSED`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure(error?: unknown): void {
    this.failureCount++;
    this.consecutiveSuccesses = 0;
    this.logger.warn(`Ghi nhận lỗi (${this.failureCount}/${this.failureThreshold}):`, { cause: error });

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  trip(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
    this.logger.error(`Ngưỡng lỗi vượt mức! Mạch đã TRIP sang OPEN trong ${this.resetTimeoutMs}ms`);
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.nextAttemptTime = 0;
  }

  private async handleFallback(
    error: unknown,
    customFallback?: (error?: unknown) => Promise<T> | T,
  ): Promise<T> {
    const fallbackFn = customFallback || this.fallback;
    if (fallbackFn) {
      return fallbackFn(error);
    }
    throw error;
  }
}
