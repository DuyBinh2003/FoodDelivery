import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';
import { Consumer } from 'sqs-consumer';
import { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class OrderIngestionConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(OrderIngestionConsumer.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(UpdateOrderStatusUseCase) private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
  ) {}

  async onModuleInit() {
    const region = this.configService.getOrThrow<string>('aws.region');
    const endpoint = this.configService.getOrThrow<string>('sqs.endpoint');
    const queueUrl = this.configService.getOrThrow<string>('sqs.queueUrl');

    const sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('aws.accessKeyId'),
        secretAccessKey: this.configService.getOrThrow<string>('aws.secretAccessKey'),
      },
    });

    try {
      await sqsClient.send(
        new CreateQueueCommand({
          QueueName: 'food-delivery-orders',
          Attributes: {
            MessageRetentionPeriod: '300',
          },
        }),
      );
    } catch {
      // Queue already exists or created
    }

    this.consumer = Consumer.create({
      queueUrl,
      sqs: sqsClient,
      handleMessage: async (message) => {
        if (!message.Body) return undefined;
        try {
          const body = JSON.parse(message.Body);
          const orderData = body.data || body;
          const orderId = orderData.id;
          const restaurantId = orderData.restaurant_id;

          this.logger.log(
            `[OrderIngestion] Pulled order message for Restaurant [${restaurantId}]: Order [${orderId}]. Order status is PENDING awaiting restaurant kitchen response.`,
          );

          return message;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error processing ingestion message: ${msg}`);
          throw err;
        }
      },
    });

    this.consumer.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Order Ingestion SQS Consumer Error: ${msg}`);
    });

    this.consumer.on('processing_error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Order Ingestion SQS Consumer Processing Error: ${msg}`);
    });

    this.consumer.start();
    this.logger.log(`Order Ingestion SQS Consumer started listening to FIFO queue: ${queueUrl}`);
  }

  onModuleDestroy() {
    if (this.consumer) {
      this.consumer.stop();
      this.logger.log('Order Ingestion SQS Consumer stopped.');
    }
  }
}
