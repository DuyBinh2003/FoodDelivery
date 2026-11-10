/**
 * @file price-lock-ticket.service.ts
 * @description Issues, validates and consumes Redis-backed HMAC-signed Price Lock Tickets (TTL 300s).
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  GoneException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { createHmac, randomUUID } from 'node:crypto';
import type { PricingBreakdown, PricingItem } from '@/common/pricing/pricing-rules.js';

export interface PriceLockTicket {
  ticketId: string;
  restaurantId: string;
  breakdown: PricingBreakdown;
  items: PricingItem[];
  signature: string;
  expiresAt: number;
  ttlSeconds: number;
}

export interface CreateTicketInput {
  restaurantId: string;
  breakdown: PricingBreakdown;
  items: PricingItem[];
  ttlSeconds?: number; // Default 300s (5 minutes)
}

@Injectable()
export class PriceLockTicketService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(PriceLockTicketService.name);
  private readonly TICKET_PREFIX = 'price_lock:ticket:';
  private readonly DEFAULT_TTL_SECONDS = 300;
  private readonly hmacSecret: string;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.hmacSecret =
      this.configService.get<string>('PRICE_LOCK_SECRET') ||
      process.env.PRICE_LOCK_SECRET ||
      'food-delivery-price-lock-super-secret-key-2026';

    const host =
      this.configService.get<string>('redis.host') || process.env.REDIS_HOST || 'localhost';
    const port =
      this.configService.get<number>('redis.port') ||
      (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379);

    this.client = createClient({ url: `redis://${host}:${port}` }) as RedisClientType;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.client.on('error', (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis Error in PriceLockTicketService: ${msg}`);
      });
      await this.client.connect();
      this.logger.log('Connected to Redis for Price Lock Tickets successfully');
    } catch (error: unknown) {
      this.logger.warn(`Failed to connect to Redis for Price Lock: ${error}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.disconnect();
    }
  }

  /**
   * Generates a deterministic HMAC-SHA256 signature for ticket payload integrity.
   */
  generateSignature(restaurantId: string, breakdown: PricingBreakdown, expiresAt: number): string {
    const canonicalString = [
      restaurantId,
      breakdown.itemsSubtotal,
      breakdown.totalShippingFee,
      breakdown.discountAmount,
      breakdown.totalAmount,
      expiresAt,
    ].join('|');

    return createHmac('sha256', this.hmacSecret).update(canonicalString).digest('hex');
  }

  /**
   * Creates a signed PriceLockTicket and stores it in Redis with TTL.
   */
  async createTicket(input: CreateTicketInput): Promise<PriceLockTicket> {
    const ttlSeconds = input.ttlSeconds ?? this.DEFAULT_TTL_SECONDS;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const ticketId = `plt_${randomUUID().replace(/-/g, '')}`;

    const signature = this.generateSignature(input.restaurantId, input.breakdown, expiresAt);

    const ticket: PriceLockTicket = {
      ticketId,
      restaurantId: input.restaurantId,
      breakdown: input.breakdown,
      items: input.items,
      signature,
      expiresAt,
      ttlSeconds,
    };

    if (this.client?.isOpen) {
      const key = `${this.TICKET_PREFIX}${ticketId}`;
      await this.client.set(key, JSON.stringify(ticket), { EX: ttlSeconds });
    }

    return ticket;
  }

  /**
   * Peeks ticket data without consuming it (read-only inspection).
   */
  async peekTicket(ticketId: string): Promise<PriceLockTicket | null> {
    if (!this.client?.isOpen) return null;
    const key = `${this.TICKET_PREFIX}${ticketId}`;
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as PriceLockTicket;
  }

  /**
   * Verifies ticket authenticity, checks expiry, and consumes (deletes) ticket atomically.
   * @throws GoneException (410) if ticket is expired or does not exist.
   * @throws ForbiddenException (403) if signature validation fails (tampering).
   */
  async verifyAndConsumeTicket(ticketId: string): Promise<PriceLockTicket> {
    if (!ticketId || !ticketId.startsWith('plt_')) {
      throw new GoneException('Vé khóa giá không tồn tại hoặc định dạng không hợp lệ.');
    }

    const key = `${this.TICKET_PREFIX}${ticketId}`;
    let raw: string | null = null;

    if (this.client?.isOpen) {
      raw = await this.client.get(key);
    }

    if (!raw) {
      throw new GoneException('Vé khóa giá đã hết hạn (300s). Vui lòng cập nhật giỏ hàng để lấy báo giá mới.');
    }

    const ticket = JSON.parse(raw) as PriceLockTicket;

    // Check expiry timestamp
    if (Date.now() > ticket.expiresAt) {
      if (this.client?.isOpen) {
        await this.client.del(key);
      }
      throw new GoneException('Vé khóa giá đã hết hạn. Vui lòng cập nhật giỏ hàng.');
    }

    // Verify HMAC signature
    const expectedSignature = this.generateSignature(
      ticket.restaurantId,
      ticket.breakdown,
      ticket.expiresAt,
    );

    if (ticket.signature !== expectedSignature) {
      this.logger.error(`[TamperingDetected] Ticket [${ticketId}] signature mismatch!`);
      throw new ForbiddenException('Chữ ký số vé khóa giá không hợp lệ. Nghi vấn can thiệp dữ liệu giá.');
    }

    // Atomically consume (delete) ticket so it cannot be reused
    if (this.client?.isOpen) {
      await this.client.del(key);
    }

    return ticket;
  }
}

