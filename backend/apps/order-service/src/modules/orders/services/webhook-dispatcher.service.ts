import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { WebhookSubscription } from '@/modules/orders/entities/webhook-subscription.entity.js';
import { WebhookDeliveryLog, WebhookDeliveryStatus } from '@/modules/orders/entities/webhook-delivery-log.entity.js';
import { CreateWebhookSubscriptionDto } from '@/modules/orders/dto/create-webhook-subscription.dto.js';
import { DispatchWebhookDto } from '@/modules/orders/dto/dispatch-webhook.dto.js';

export interface WebhookDispatchResult {
  subscriptionId: string;
  targetName: string;
  targetUrl: string;
  status: WebhookDeliveryStatus;
  httpStatusCode: number | null;
  attempts: number;
  deliveryLogId: string;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDeliveryLog)
    private readonly deliveryLogRepo: Repository<WebhookDeliveryLog>,
  ) {}

  /**
   * Tính chữ ký số bảo mật HMAC-SHA256
   */
  computeSignature(payload: Record<string, unknown>, secretKey: string): string {
    const rawPayload = JSON.stringify(payload);
    const hash = crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex');
    return `sha256=${hash}`;
  }

  /**
   * Xác thực chữ ký số HMAC-SHA256
   */
  verifySignature(payload: Record<string, unknown>, secretKey: string, providedSignature: string): boolean {
    const expected = this.computeSignature(payload, secretKey);
    if (!providedSignature || !providedSignature.startsWith('sha256=')) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedSignature));
    } catch {
      return false;
    }
  }

  /**
   * Đăng ký Webhook Target mới (n8n, webhook endpoint)
   */
  async createSubscription(dto: CreateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    const secretKey = dto.secretKey || crypto.randomBytes(32).toString('hex');
    const subscription = this.subscriptionRepo.create({
      target_name: dto.targetName,
      target_url: dto.targetUrl,
      subscribed_events: dto.subscribedEvents,
      secret_key: secretKey,
      is_active: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Danh sách subscriptions
   */
  async getSubscriptions(activeOnly = true): Promise<WebhookSubscription[]> {
    if (activeOnly) {
      return this.subscriptionRepo.find({ where: { is_active: true } });
    }
    return this.subscriptionRepo.find();
  }

  /**
   * Lấy chi tiết 1 subscription
   */
  async getSubscriptionById(id: string): Promise<WebhookSubscription> {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Webhook subscription with id ${id} not found`);
    }
    return sub;
  }

  /**
   * Phát sự kiện Webhook tới các targets đã đăng ký
   */
  async dispatch(dto: DispatchWebhookDto): Promise<WebhookDispatchResult[]> {
    let targets: WebhookSubscription[];

    if (dto.targetSubscriptionId) {
      const single = await this.getSubscriptionById(dto.targetSubscriptionId);
      targets = [single];
    } else {
      const allActive = await this.getSubscriptions(true);
      targets = allActive.filter((sub) => sub.subscribed_events.includes(dto.eventType) || sub.subscribed_events.includes('*'));
    }

    if (targets.length === 0) {
      this.logger.log(`No active webhook subscriptions found for event '${dto.eventType}'`);
      return [];
    }

    const results: WebhookDispatchResult[] = [];
    for (const target of targets) {
      const result = await this.sendWithRetry(target, dto);
      results.push(result);
    }

    return results;
  }

  /**
   * Gửi HTTP POST với chữ ký số và Exponential Backoff Retry (Tối đa 3 lần)
   */
  async sendWithRetry(
    target: WebhookSubscription,
    dto: DispatchWebhookDto,
    maxRetries = 3,
  ): Promise<WebhookDispatchResult> {
    const signature = this.computeSignature(dto.payload, target.secret_key);
    const timestamp = new Date().toISOString();

    let attempts = 0;
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let deliveryStatus: WebhookDeliveryStatus = WebhookDeliveryStatus.FAILED;

    while (attempts < maxRetries) {
      attempts++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(target.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': dto.eventType,
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Delivery-Id': dto.eventId,
          },
          body: JSON.stringify(dto.payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        statusCode = response.status;
        responseBody = await response.text();

        if (response.ok) {
          deliveryStatus = WebhookDeliveryStatus.SUCCESS;
          this.logger.log(`Successfully dispatched webhook event '${dto.eventType}' to ${target.target_name} (${target.target_url}) on attempt ${attempts}`);
          break;
        }

        this.logger.warn(`Webhook to ${target.target_name} returned status ${statusCode} on attempt ${attempts}`);
      } catch (error: unknown) {
        clearTimeout(timeout);
        responseBody = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Webhook delivery attempt ${attempts} failed for ${target.target_name}: ${responseBody}`);
      }

      // Nếu chưa thành công và còn lượt thử, delay backoff
      if (attempts < maxRetries) {
        const backoffMs = Math.pow(2, attempts - 1) * 100;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // Ghi log giao vận vào cơ sở dữ liệu
    const log = this.deliveryLogRepo.create({
      subscription_id: target.id,
      event_type: dto.eventType,
      event_id: dto.eventId,
      payload: dto.payload,
      status: deliveryStatus,
      http_status_code: statusCode,
      response_body: responseBody,
      attempt_count: attempts,
      last_attempt_at: new Date(),
    });

    const savedLog = await this.deliveryLogRepo.save(log);

    return {
      subscriptionId: target.id,
      targetName: target.target_name,
      targetUrl: target.target_url,
      status: deliveryStatus,
      httpStatusCode: statusCode,
      attempts,
      deliveryLogId: savedLog.id,
    };
  }
}
