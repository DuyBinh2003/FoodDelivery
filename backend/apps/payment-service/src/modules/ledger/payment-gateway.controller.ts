import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
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

  @Post('webhooks/simulate')
  @HttpCode(HttpStatus.OK)
  async simulateWebhook(
    @Body()
    body: {
      gateway: 'VNPAY' | 'MOMO';
      transactionRef: string;
      amount: number;
      walletAccountId?: string;
      orderId?: string;
      isSuccess?: boolean;
    },
  ) {
    this.logger.log(`[SimulateWebhook] Triggering simulated webhook for ${body.gateway} ref ${body.transactionRef}`);
    const isSuccess = body.isSuccess !== false;

    if (body.gateway === 'VNPAY') {
      const vnpAmount = (body.amount * 100).toString();
      const orderInfo = body.walletAccountId
        ? `Thanh toán nạp tiền ví ${body.walletAccountId}`
        : `Thanh toán đơn hàng ${body.orderId || body.transactionRef}`;

      const mockParams: Record<string, string> = {
        vnp_Amount: vnpAmount,
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_OrderInfo: orderInfo,
        vnp_PayDate: '20261022180000',
        vnp_ResponseCode: isSuccess ? '00' : '24',
        vnp_TmnCode: 'FOODDELIVNP',
        vnp_TransactionNo: `MOCK_VNP_${Date.now()}`,
        vnp_TransactionStatus: isSuccess ? '00' : '02',
        vnp_TxnRef: body.transactionRef,
      };

      const sortedKeys = Object.keys(mockParams).sort();
      const signData = sortedKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(mockParams[k])}`)
        .join('&');
      const hmac = crypto.createHmac('sha512', 'SECRETKEY_VNPAY_SANDBOX_HASH512_DEMO_2026');
      mockParams['vnp_SecureHash'] = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      const result = await this.webhookUseCase.handleVnPayWebhook(mockParams as unknown as VnPayWebhookDto);
      return {
        success: isSuccess,
        gateway: 'VNPAY',
        transactionRef: body.transactionRef,
        amount: body.amount,
        result,
      };
    } else {
      const extraData = Buffer.from(
        JSON.stringify({ walletAccountId: body.walletAccountId, orderId: body.orderId }),
      ).toString('base64');
      const orderId = body.transactionRef;

      const mockMoMo: MoMoWebhookDto = {
        partnerCode: 'MOMO_FOOD_DELIVERY',
        orderId,
        requestId: `REQ_${Date.now()}`,
        amount: body.amount,
        orderInfo: `Thanh toán MoMo ${body.orderId || body.walletAccountId || body.transactionRef}`,
        orderType: 'momo_wallet',
        transId: Date.now(),
        resultCode: isSuccess ? 0 : 1006,
        message: isSuccess ? 'Giao dịch thành công.' : 'Giao dịch bị hủy.',
        payType: 'qr',
        responseTime: Date.now(),
        extraData,
        signature: '',
      };

      const rawSignature =
        `accessKey=ACCESS_KEY_MOMO_2026&amount=${mockMoMo.amount}&extraData=${extraData}&message=${mockMoMo.message}` +
        `&orderId=${mockMoMo.orderId}&orderInfo=${mockMoMo.orderInfo}&orderType=${mockMoMo.orderType}&partnerCode=${mockMoMo.partnerCode}` +
        `&payType=${mockMoMo.payType}&requestId=${mockMoMo.requestId}&responseTime=${mockMoMo.responseTime}&resultCode=${mockMoMo.resultCode}&transId=${mockMoMo.transId}`;

      mockMoMo.signature = crypto
        .createHmac('sha256', 'SECRET_KEY_MOMO_DEMO_SHA256_2026')
        .update(rawSignature)
        .digest('hex');

      const result = await this.webhookUseCase.handleMoMoWebhook(mockMoMo);
      return {
        success: isSuccess,
        gateway: 'MOMO',
        transactionRef: body.transactionRef,
        amount: body.amount,
        result,
      };
    }
  }
}
