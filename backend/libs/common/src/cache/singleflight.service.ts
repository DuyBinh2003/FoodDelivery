import { Injectable, Logger } from '@nestjs/common';

export interface SingleflightResult<T> {
  data: T;
  shared: boolean;
}

@Injectable()
export class SingleflightService {
  private readonly logger = new Logger(SingleflightService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Thực thi hàm fn() dưới cơ chế Singleflight.
   * Nếu đã có một promise đang thực thi cho cùng key, các request đến sau
   * sẽ dùng chung (share) kết quả của promise đó mà không gọi fn() lần thứ 2.
   */
  async do<T>(key: string, fn: () => Promise<T>): Promise<SingleflightResult<T>> {
    const existing = this.inFlight.get(key);
    if (existing) {
      this.logger.debug(`[Singleflight HIT] Sharing in-flight promise for key: ${key}`);
      const data = (await existing) as T;
      return { data, shared: true };
    }

    // Tạo promise mới và lưu vào in-flight map
    const promise = (async () => {
      try {
        return await fn();
      } finally {
        // Đảm bảo dọn dẹp in-flight map ngay khi promise hoàn tất (dù thành công hay lỗi)
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);

    try {
      const data = await promise;
      return { data, shared: false };
    } catch (error: unknown) {
      this.logger.error(`[Singleflight ERROR] Execution failed for key: ${key}`, { cause: error });
      throw error;
    }
  }

  /**
   * Trả về số lượng công việc đang xử lý đồng thời
   */
  getInFlightCount(): number {
    return this.inFlight.size;
  }
}

