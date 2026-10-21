import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PaymentGatewayService } from '@/modules/ledger/services/payment-gateway.service.js';
import { ProcessGatewayWebhookUseCase } from '@/modules/ledger/usecases/process-gateway-webhook.usecase.js';
import { CreateGatewayPaymentUrlDto } from '@/modules/ledger/dto/create-gateway-payment-url.dto.js';
import { VnPayWebhookDto } from '@/modules/ledger/dto/vnpay-webhook.dto.js';
import { MoMoWebhookDto } from '@/modules/ledger/dto/momo-webhook.dto.js';

@Controller('payment')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly gatewayService: PaymentGatewayService,
    private readonly webhookUseCase: ProcessGatewayWebhookUseCase,
  ) {}

  @Post('gateway/create-url')
  @HttpCode(HttpStatus.OK)
  createPaymentUrl(@Body() dto: CreateGatewayPaymentUrlDto) {
    return this.gatewayService.createPaymentUrl(dto);
  }

  @Post('webhooks/vnpay')
  @HttpCode(HttpStatus.OK)
  async handleVnPayWebhookPost(@Body() payload: VnPayWebhookDto) {
    this.logger.log(`Received VNPay Webhook POST for txn: ${payload.vnp_TxnRef}`);
    return this.webhookUseCase.handleVnPayWebhook(payload);
  }

  @Get('webhooks/vnpay')
  @HttpCode(HttpStatus.OK)
  async handleVnPayWebhookGet(@Query() query: VnPayWebhookDto) {
    this.logger.log(`Received VNPay Webhook GET for txn: ${query.vnp_TxnRef}`);
    return this.webhookUseCase.handleVnPayWebhook(query);
  }

  @Get('webhooks/vnpay-return')
  @HttpCode(HttpStatus.OK)
  async handleVnPayReturn(@Query() query: VnPayWebhookDto) {
    this.logger.log(`VNPay Return redirect for txn: ${query.vnp_TxnRef}`);
    const result = await this.webhookUseCase.handleVnPayWebhook(query);
    return {
      status: query.vnp_ResponseCode === '00' ? 'SUCCESS' : 'FAILED',
      responseCode: query.vnp_ResponseCode,
      transactionRef: query.vnp_TxnRef,
      amount: Number(query.vnp_Amount) / 100,
      bankCode: query.vnp_BankCode,
      message: result.Message,
    };
  }

  @Post('webhooks/momo')
  @HttpCode(HttpStatus.OK)
  async handleMoMoWebhook(@Body() payload: MoMoWebhookDto) {
    this.logger.log(`Received MoMo Webhook for orderId: ${payload.orderId}`);
    return this.webhookUseCase.handleMoMoWebhook(payload);
  }
}
