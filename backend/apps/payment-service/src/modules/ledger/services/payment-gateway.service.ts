import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { OnlinePaymentGateway, type CreateGatewayPaymentUrlDto } from '@/modules/ledger/dto/create-gateway-payment-url.dto.js';
import type { MoMoWebhookDto } from '@/modules/ledger/dto/momo-webhook.dto.js';

export interface PaymentUrlResult {
  paymentUrl: string;
  qrPayload: string;
  transactionRef: string;
  gateway: OnlinePaymentGateway;
  amount: number;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  // VNPay Sandbox Config
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpUrl: string;

  // MoMo Sandbox Config
  private readonly momoPartnerCode: string;
  private readonly momoAccessKey: string;
  private readonly momoSecretKey: string;
  private readonly momoEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.vnpTmnCode = this.configService.get<string>('VNPAY_TMN_CODE', 'FOODDELIVNP');
    this.vnpHashSecret = this.configService.get<string>('VNPAY_HASH_SECRET', 'SECRETKEY_VNPAY_SANDBOX_HASH512_DEMO_2026');
    this.vnpUrl = this.configService.get<string>('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');

    this.momoPartnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', 'MOMO_FOOD_DELIVERY');
    this.momoAccessKey = this.configService.get<string>('MOMO_ACCESS_KEY', 'ACCESS_KEY_MOMO_2026');
    this.momoSecretKey = this.configService.get<string>('MOMO_SECRET_KEY', 'SECRET_KEY_MOMO_DEMO_SHA256_2026');
    this.momoEndpoint = this.configService.get<string>('MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/pay');
  }

  createPaymentUrl(dto: CreateGatewayPaymentUrlDto): PaymentUrlResult {
    const transactionRef = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    if (dto.paymentMethod === OnlinePaymentGateway.VNPAY) {
      return this.generateVnPayUrl(dto, transactionRef);
    } else {
      return this.generateMoMoUrl(dto, transactionRef);
    }
  }

  private generateVnPayUrl(dto: CreateGatewayPaymentUrlDto, txnRef: string): PaymentUrlResult {
    const createDate = this.formatDateToYMDHMS(new Date());
    const vnpAmount = dto.amount * 100; // VNPay quy định nhân 100

    const returnUrl = dto.returnUrl || 'http://localhost:3000/payment/webhooks/vnpay-return';
    const orderInfo = dto.orderInfo || `Thanh toán nạp tiền ví ${dto.walletAccountId.slice(0, 8)}`;

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: vnpAmount.toString(),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    // Sắp xếp các tham số theo bảng chữ cái A-Z
    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(vnpParams[k])}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = `${this.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      paymentUrl,
      qrPayload: `vnpay://qr?data=${encodeURIComponent(paymentUrl)}`,
      transactionRef: txnRef,
      gateway: OnlinePaymentGateway.VNPAY,
      amount: dto.amount,
    };
  }

  private generateMoMoUrl(dto: CreateGatewayPaymentUrlDto, txnRef: string): PaymentUrlResult {
    const requestId = `REQ_${Date.now()}`;
    const orderInfo = dto.orderInfo || `Thanh toán nạp ví ${dto.walletAccountId.slice(0, 8)}`;
    const redirectUrl = dto.returnUrl || 'http://localhost:3000/payment/webhooks/momo-return';
    const ipnUrl = 'http://localhost:3000/payment/webhooks/momo';
    const extraData = Buffer.from(JSON.stringify({ walletAccountId: dto.walletAccountId, orderId: dto.orderId })).toString('base64');
    const requestType = 'captureWallet';

    const rawSignature =
      `accessKey=${this.momoAccessKey}&amount=${dto.amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${txnRef}&orderInfo=${orderInfo}&partnerCode=${this.momoPartnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', this.momoSecretKey)
      .update(rawSignature)
      .digest('hex');

    const paymentUrl = `${this.momoEndpoint}?partnerCode=${this.momoPartnerCode}&orderId=${txnRef}&requestId=${requestId}&amount=${dto.amount}&orderInfo=${encodeURIComponent(orderInfo)}&signature=${signature}`;

    return {
      paymentUrl,
      qrPayload: `momo://payment?orderId=${txnRef}&amount=${dto.amount}`,
      transactionRef: txnRef,
      gateway: OnlinePaymentGateway.MOMO,
      amount: dto.amount,
    };
  }

  verifyVnPaySignature(params: Record<string, string>): boolean {
    const secureHash = params['vnp_SecureHash'];
    if (!secureHash) return false;

    // Loại bỏ vnp_SecureHash và vnp_SecureHashType khỏi dữ liệu cần ký
    const signParams: Record<string, string> = {};
    for (const key of Object.keys(params)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && key.startsWith('vnp_')) {
        signParams[key] = params[key];
      }
    }

    const sortedKeys = Object.keys(signParams).sort();
    const signData = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(signParams[k])}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
    const expectedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash.toLowerCase() === expectedHash.toLowerCase();
  }

  verifyMoMoSignature(payload: MoMoWebhookDto): boolean {
    const {
      amount,
      extraData = '',
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType = '',
      requestId,
      responseTime,
      resultCode,
      transId,
      signature,
    } = payload;

    if (!signature) return false;

    const rawSignature =
      `accessKey=${this.momoAccessKey}&amount=${amount}&extraData=${extraData}&message=${message}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}` +
      `&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.momoSecretKey)
      .update(rawSignature)
      .digest('hex');

    return signature === expectedSignature;
  }

  private formatDateToYMDHMS(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
}
