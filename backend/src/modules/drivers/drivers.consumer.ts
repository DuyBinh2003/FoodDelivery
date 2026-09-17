import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Consumer } from 'sqs-consumer';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class DriversConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(DriversConsumer.name);

  constructor(
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(UpdateOrderStatusUseCase) private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
  ) { }

  onModuleInit() {
    const region = this.configService.get<string>('aws.region')!;
    const endpoint = this.configService.get<string>('sqs.endpoint')!;
    const queueUrl = this.configService.get<string>('sqs.queueUrl')!;

    const sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
    });

    this.consumer = Consumer.create({
      queueUrl,
      sqs: sqsClient as any,
      handleMessage: async (message) => {
        if (!message.Body) return undefined;
        try {
          const body = JSON.parse(message.Body);
          if (body.event === 'ORDER_CREATED') {
            const { orderId } = body.data;
            this.logger.log(`Received ORDER_CREATED for Order: ${orderId}. Finding nearest driver...`);

            setTimeout(async () => {
              this.logger.log(`Driver found for Order: ${orderId}. Updating status to ACCEPTED.`);
              await this.updateOrderStatusUseCase.execute({ orderId, dto: { status: OrderStatus.ACCEPTED } });
            }, 3000);
          }
          return message;
        } catch (err: any) {
          this.logger.error(`Error processing message: ${err.message}`);
          throw err;
        }
      },
    });

    this.consumer.on('error', (err: any) => {
      this.logger.error(`SQS Consumer Error: ${err.message}`);
    });

    this.consumer.on('processing_error', (err: any) => {
      this.logger.error(`SQS Consumer Processing Error: ${err.message}`);
    });

    this.consumer.start();
    this.logger.log('Drivers SQS Consumer started listening to ' + queueUrl);
  }

  onModuleDestroy() {
    if (this.consumer) {
      this.consumer.stop();
      this.logger.log('Drivers SQS Consumer stopped.');
    }
  }
}
