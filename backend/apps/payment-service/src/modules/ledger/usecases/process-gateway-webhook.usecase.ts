import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayService } from '@/modules/ledger/services/payment-gateway.service.js';
import { TopupWalletUseCase } from '@/modules/ledger/usecases/topup-wallet.usecase.js';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { IdempotencyKey } from '@/modules/ledger/entities/idempotency-key.entity.js';
import type { VnPayWebhookDto } from '@/modules/ledger/dto/vnpay-webhook.dto.js';
import type { MoMoWebhookDto } from '@/modules/ledger/dto/momo-webhook.dto.js';

@Injectable()
export class ProcessGatewayWebhookUseCase {
  private readonly logger = new Logger(ProcessGatewayWebhookUseCase.name);

  constructor(
    private readonly gatewayService: PaymentGatewayService,
    private readonly topupWalletUseCase: TopupWalletUseCase,
    private readonly walletReadRepo: WalletReadRepository,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepo: Repository<IdempotencyKey>,
  ) {}

  async handleVnPayWebhook(params: VnPayWebhookDto): Promise<{ RspCode: string; Message: string }> {
    const rawParams = params as unknown as Record<string, string>;
    const isValidSignature = this.gatewayService.verifyVnPaySignature(rawParams);

    if (!isValidSignature) {
      this.logger.warn(`[VNPayWebhook] Invalid signature for txnRef: ${params.vnp_TxnRef}`);
      throw new BadRequestException('Chữ ký bảo mật VNPay không hợp lệ.');
    }

    const txnRef = params.vnp_TxnRef;
    const idempotencyKey = `VNPAY_${txnRef}`;

    // Kiểm tra Idempotency chống Duplicate Charges
    const existingKey = await this.idempotencyRepo.findOne({
      where: { idempotency_key: idempotencyKey, is_deleted: false },
    });

    if (existingKey && existingKey.status === 'SUCCEEDED') {
      this.logger.log(`[VNPayWebhook] Transaction ${txnRef} already processed successfully. Returning cached response.`);
      return { RspCode: '00', Message: 'Confirm Success' };
    }

    const isSuccess = params.vnp_ResponseCode === '00';
    const amount = Number(params.vnp_Amount) / 100;

    if (!isSuccess) {
      this.logger.warn(`[VNPayWebhook] Transaction ${txnRef} failed with code ${params.vnp_ResponseCode}`);
      await this.saveIdempotencyRecord(idempotencyKey, '/payment/webhooks/vnpay', 'FAILED', 200, {
        RspCode: '00',
        Message: 'Transaction failed at gateway',
      });
      return { RspCode: '00', Message: 'Confirm Success' };
    }

    try {
      // Tìm ví người dùng cần nạp (trích xuất hoặc dùng ví hợp lệ)
      const targetWallet = await this.resolveTargetWallet(params.vnp_OrderInfo);

      if (targetWallet) {
        await this.topupWalletUseCase.execute({
          walletAccountId: targetWallet.id,
          amount: String(amount),
          paymentMethod: 'VNPAY',
          referenceId: params.vnp_TransactionNo || txnRef,
          idempotencyKey,
        });

        this.logger.log(
          `[VNPayWebhook] Successfully credited ${amount} VND to wallet ${targetWallet.id} for txn ${txnRef}`,
        );
      }

      await this.saveIdempotencyRecord(idempotencyKey, '/payment/webhooks/vnpay', 'SUCCEEDED', 200, {
        RspCode: '00',
        Message: 'Confirm Success',
      });

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error: unknown) {
      this.logger.error(`[VNPayWebhook] Error processing payment ${txnRef}:`, { cause: error });
      throw error;
    }
  }

  async handleMoMoWebhook(payload: MoMoWebhookDto): Promise<{ resultCode: number; message: string }> {
    const isValidSignature = this.gatewayService.verifyMoMoSignature(payload);

    if (!isValidSignature) {
      this.logger.warn(`[MoMoWebhook] Invalid signature for orderId: ${payload.orderId}`);
      throw new BadRequestException('Chữ ký bảo mật MoMo không hợp lệ.');
    }

    const orderId = payload.orderId;
    const idempotencyKey = `MOMO_${orderId}`;

    const existingKey = await this.idempotencyRepo.findOne({
      where: { idempotency_key: idempotencyKey, is_deleted: false },
    });

    if (existingKey && existingKey.status === 'SUCCEEDED') {
      this.logger.log(`[MoMoWebhook] Order ${orderId} already processed. Returning cached success.`);
      return { resultCode: 0, message: 'Success' };
    }

    if (payload.resultCode !== 0) {
      this.logger.warn(`[MoMoWebhook] Payment failed for ${orderId} with code: ${payload.resultCode}`);
      await this.saveIdempotencyRecord(idempotencyKey, '/payment/webhooks/momo', 'FAILED', 200, {
        resultCode: 0,
        message: 'Acknowledged failure',
      });
      return { resultCode: 0, message: 'Success' };
    }

    try {
      let targetWalletId: string | null = null;
      if (payload.extraData) {
        try {
          const parsed = JSON.parse(Buffer.from(payload.extraData, 'base64').toString('utf-8'));
          targetWalletId = parsed.walletAccountId;
        } catch {
          // ignore
        }
      }

      const targetWallet = targetWalletId
        ? await this.walletReadRepo.getWalletById(targetWalletId)
        : await this.resolveTargetWallet(payload.orderInfo);

      if (targetWallet) {
        await this.topupWalletUseCase.execute({
          walletAccountId: targetWallet.id,
          amount: String(payload.amount),
          paymentMethod: 'MOMO',
          referenceId: String(payload.transId || payload.orderId),
          idempotencyKey,
        });

        this.logger.log(
          `[MoMoWebhook] Successfully credited ${payload.amount} VND to wallet ${targetWallet.id} for order ${orderId}`,
        );
      }

      await this.saveIdempotencyRecord(idempotencyKey, '/payment/webhooks/momo', 'SUCCEEDED', 200, {
        resultCode: 0,
        message: 'Success',
      });

      return { resultCode: 0, message: 'Success' };
    } catch (error: unknown) {
      this.logger.error(`[MoMoWebhook] Error processing payment ${orderId}:`, { cause: error });
      throw error;
    }
  }

  private async resolveTargetWallet(orderInfo?: string) {
    if (!orderInfo) return null;
    // Tìm UUID nếu có trong chuỗi orderInfo
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = orderInfo.match(uuidRegex);
    if (match) {
      return this.walletReadRepo.getWalletById(match[0]);
    }
    return null;
  }

  private async saveIdempotencyRecord(
    key: string,
    endpoint: string,
    status: string,
    statusCode: number,
    body: Record<string, unknown>,
  ) {
    const record = this.idempotencyRepo.create({
      idempotency_key: key,
      endpoint,
      request_hash: key,
      status,
      response_status_code: statusCode,
      response_body: body,
      locked_until: new Date(Date.now() + 86400000), // 24h
    });
    await this.idempotencyRepo.save(record);
  }
}
