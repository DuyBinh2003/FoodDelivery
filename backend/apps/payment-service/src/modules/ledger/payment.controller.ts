import { Controller, Post, Get, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessPaymentUseCase } from './usecases/process-payment.usecase.js';
import { LedgerReadRepository } from './repositories/ledger.read.repository.js';
import { PaymentIntent } from './entities/payment-intent.entity.js';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly ledgerReadRepo: LedgerReadRepository,
    @InjectRepository(PaymentIntent)
    private readonly paymentIntentRepo: Repository<PaymentIntent>,
  ) {}

  @Post('process')
  async processPayment(@Body() dto: ProcessPaymentDto) {
    return this.processPaymentUseCase.execute(dto);
  }

  @Get('order/:orderId')
  async getPaymentByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const paymentIntent = await this.paymentIntentRepo.findOne({
      where: { order_id: orderId, is_deleted: false },
      order: { created_at: 'DESC' },
    });

    if (!paymentIntent) {
      return null;
    }

    let transaction = null;
    let entries: unknown[] = [];

    if (paymentIntent.gateway_transaction_id) {
      transaction = await this.ledgerReadRepo.getTransactionByCode(paymentIntent.gateway_transaction_id);
      if (transaction) {
        entries = await this.ledgerReadRepo.getEntriesByTransactionId(transaction.id);
      }
    }

    return {
      paymentIntent,
      transaction,
      entries,
    };
  }
}
