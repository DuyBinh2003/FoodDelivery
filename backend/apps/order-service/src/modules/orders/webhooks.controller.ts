import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebhookDispatcherService } from '@/modules/orders/services/webhook-dispatcher.service.js';
import { CreateWebhookSubscriptionDto } from '@/modules/orders/dto/create-webhook-subscription.dto.js';
import { DispatchWebhookDto } from '@/modules/orders/dto/dispatch-webhook.dto.js';

@Controller('orders/webhooks')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WebhooksController {
  constructor(private readonly webhookDispatcherService: WebhookDispatcherService) {}

  /**
   * Đăng ký Webhook Subscription mới (Ví dụ: n8n webhook URL)
   * POST /orders/webhooks/subscriptions
   */
  @Post('subscriptions')
  async createSubscription(@Body() dto: CreateWebhookSubscriptionDto) {
    return this.webhookDispatcherService.createSubscription(dto);
  }

  /**
   * Lấy danh sách Webhook Subscriptions
   * GET /orders/webhooks/subscriptions?activeOnly=true
   */
  @Get('subscriptions')
  async getSubscriptions(@Query('activeOnly') activeOnly?: string) {
    const isActive = activeOnly === undefined ? true : activeOnly === 'true';
    return this.webhookDispatcherService.getSubscriptions(isActive);
  }

  /**
   * Lấy chi tiết một Webhook Subscription
   * GET /orders/webhooks/subscriptions/:id
   */
  @Get('subscriptions/:id')
  async getSubscriptionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhookDispatcherService.getSubscriptionById(id);
  }

  /**
   * Kích hoạt phát thử nghiệm một sự kiện Webhook (Test Ping / Dispatch)
   * POST /orders/webhooks/test-dispatch
   */
  @Post('test-dispatch')
  async testDispatch(@Body() dto: DispatchWebhookDto) {
    return this.webhookDispatcherService.dispatch(dto);
  }
}
