import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface NearbyDriverCandidate {
  driverId: string;
  distanceKm: number;
}

export interface DispatchSessionData {
  orderId: string;
  candidates: string[];
  rejected: string[];
  currentCandidate: string | null;
  expiresAt: number; // timestamp ms
  status: 'OFFERED' | 'ACCEPTED' | 'EXHAUSTED' | 'CANCELLED';
}

@Injectable()
export class DriverGeoRedisRepository implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(DriverGeoRedisRepository.name);
  private readonly GEO_KEY = 'drivers:geo';
  private readonly DRIVER_STATUS_PREFIX = 'driver:status:';
  private readonly DISPATCH_PREFIX = 'dispatch:order:';

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host') || process.env.REDIS_HOST || 'localhost';
    const port = this.configService.get<number>('redis.port') || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379);
    const redisUrl = `redis://${host}:${port}`;
    this.client = createClient({ url: redisUrl }) as RedisClientType;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.client.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis Error in DriverGeoRedisRepository: ${message}`);
      });
      await this.client.connect();
      this.logger.log('Connected to Redis for Driver Geo Dispatching successfully');
    } catch (error: unknown) {
      this.logger.error('Failed to connect to Redis for Driver Geo:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.disconnect();
      this.logger.log('Disconnected from Redis for Driver Geo');
    }
  }

  /**
   * Cập nhật vị trí tài xế vào Redis Geospatial và Hash trạng thái
   */
  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    if (!this.client?.isOpen) return;

    try {
      await this.client.geoAdd(this.GEO_KEY, {
        longitude: lng,
        latitude: lat,
        member: driverId,
      });

      const statusKey = `${this.DRIVER_STATUS_PREFIX}${driverId}`;
      await this.client.hSet(statusKey, {
        status: 'ONLINE',
        lat: lat.toString(),
        lng: lng.toString(),
        updated_at: new Date().toISOString(),
      });
      await this.client.expire(statusKey, 86400); // 24h
    } catch (error: unknown) {
      this.logger.error(`Error updating location for driver [${driverId}]:`, error);
    }
  }

  /**
   * Xóa tài xế khỏi Redis Geospatial khi chuyển sang OFFLINE
   */
  async removeDriverFromGeo(driverId: string): Promise<void> {
    if (!this.client?.isOpen) return;

    try {
      await this.client.zRem(this.GEO_KEY, driverId);
      const statusKey = `${this.DRIVER_STATUS_PREFIX}${driverId}`;
      await this.client.hSet(statusKey, {
        status: 'OFFLINE',
        updated_at: new Date().toISOString(),
      });
    } catch (error: unknown) {
      this.logger.error(`Error removing driver [${driverId}] from geo:`, error);
    }
  }

  /**
   * Quét tìm các tài xế trong bán kính radiusKm (mặc định 5km) quanh điểm lat, lng
   */
  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm: number = 5,
  ): Promise<NearbyDriverCandidate[]> {
    if (!this.client?.isOpen) return [];

    try {
      // Dùng lệnh GEOSEARCH FROMLONLAT lng lat BYRADIUS radiusKm km ASC WITHDIST
      const rawResults = (await this.client.sendCommand([
        'GEOSEARCH',
        this.GEO_KEY,
        'FROMLONLAT',
        lng.toString(),
        lat.toString(),
        'BYRADIUS',
        radiusKm.toString(),
        'km',
        'ASC',
        'WITHDIST',
      ])) as Array<[string, string] | string> | null;

      if (!rawResults || !Array.isArray(rawResults)) {
        return [];
      }

      const candidates: NearbyDriverCandidate[] = [];
      for (const item of rawResults) {
        if (Array.isArray(item) && item.length >= 2) {
          const driverId = String(item[0]);
          const distKm = parseFloat(String(item[1]));
          candidates.push({
            driverId,
            distanceKm: isNaN(distKm) ? 0 : Math.round(distKm * 10) / 10,
          });
        }
      }

      return candidates;
    } catch (error: unknown) {
      this.logger.warn(`GEOSEARCH failed or not supported, returning empty: ${error}`);
      return [];
    }
  }

  /**
   * Khởi tạo phiên điều phối cho đơn hàng (15 giây đếm ngược mỗi vòng)
   */
  async createDispatchSession(
    orderId: string,
    candidateDriverIds: string[],
    offerDurationSeconds: number = 15,
  ): Promise<DispatchSessionData> {
    const key = `${this.DISPATCH_PREFIX}${orderId}`;
    const firstCandidate = candidateDriverIds.length > 0 ? candidateDriverIds[0] : null;
    const expiresAt = Date.now() + offerDurationSeconds * 1000;

    const session: DispatchSessionData = {
      orderId,
      candidates: candidateDriverIds,
      rejected: [],
      currentCandidate: firstCandidate,
      expiresAt,
      status: firstCandidate ? 'OFFERED' : 'EXHAUSTED',
    };

    if (this.client?.isOpen) {
      await this.client.hSet(key, {
        orderId,
        candidates: JSON.stringify(session.candidates),
        rejected: JSON.stringify(session.rejected),
        currentCandidate: session.currentCandidate || '',
        expiresAt: session.expiresAt.toString(),
        status: session.status,
      });
      // TTL 5 phút cho toàn bộ phiên
      await this.client.expire(key, 300);
    }

    return session;
  }

  /**
   * Lấy thông tin phiên điều phối đơn hàng
   */
  async getDispatchSession(orderId: string): Promise<DispatchSessionData | null> {
    if (!this.client?.isOpen) return null;

    try {
      const key = `${this.DISPATCH_PREFIX}${orderId}`;
      const data = await this.client.hGetAll(key);
      if (!data || !data.orderId) return null;

      return {
        orderId: data.orderId,
        candidates: data.candidates ? JSON.parse(data.candidates) : [],
        rejected: data.rejected ? JSON.parse(data.rejected) : [],
        currentCandidate: data.currentCandidate || null,
        expiresAt: data.expiresAt ? parseInt(data.expiresAt, 10) : 0,
        status: (data.status as DispatchSessionData['status']) || 'OFFERED',
      };
    } catch (error: unknown) {
      this.logger.error(`Error reading dispatch session for order [${orderId}]:`, error);
      return null;
    }
  }

  /**
   * Ghi nhận từ chối / timeout và chuyển cuốc tới tài xế tiếp theo
   */
  async recordRejectionAndAdvance(
    orderId: string,
    driverId: string,
    offerDurationSeconds: number = 15,
  ): Promise<{ nextDriverId: string | null; isExhausted: boolean }> {
    const session = await this.getDispatchSession(orderId);
    if (!session || session.status === 'ACCEPTED') {
      return { nextDriverId: null, isExhausted: true };
    }

    if (!session.rejected.includes(driverId)) {
      session.rejected.push(driverId);
    }

    // Tìm ứng viên kế tiếp chưa có trong rejected
    const nextDriverId = session.candidates.find((d) => !session.rejected.includes(d)) || null;
    const isExhausted = nextDriverId === null;

    session.currentCandidate = nextDriverId;
    session.expiresAt = isExhausted ? 0 : Date.now() + offerDurationSeconds * 1000;
    session.status = isExhausted ? 'EXHAUSTED' : 'OFFERED';

    if (this.client?.isOpen) {
      const key = `${this.DISPATCH_PREFIX}${orderId}`;
      await this.client.hSet(key, {
        rejected: JSON.stringify(session.rejected),
        currentCandidate: nextDriverId || '',
        expiresAt: session.expiresAt.toString(),
        status: session.status,
      });
    }

    return { nextDriverId, isExhausted };
  }

  /**
   * Khóa nhận đơn hàng nguyên tử (Atomic Accept)
   */
  async acceptDispatchSession(orderId: string, driverId: string): Promise<boolean> {
    const session = await this.getDispatchSession(orderId);
    if (!session) return false;

    // Chỉ tài xế đang được mời và đơn đang ở trạng thái OFFERED mới được nhận
    if (session.status !== 'OFFERED' || session.currentCandidate !== driverId) {
      return false;
    }

    if (this.client?.isOpen) {
      const key = `${this.DISPATCH_PREFIX}${orderId}`;
      await this.client.hSet(key, {
        status: 'ACCEPTED',
        currentCandidate: driverId,
      });
    }

    return true;
  }

  /**
   * Xóa phiên điều phối
   */
  async clearDispatchSession(orderId: string): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.del(`${this.DISPATCH_PREFIX}${orderId}`);
    }
  }
}
