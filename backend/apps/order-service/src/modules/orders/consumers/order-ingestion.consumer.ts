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
    const region = this.configService.get<string>('aws.region') || 'ap-southeast-1';
    const endpoint = this.configService.get<string>('sqs.endpoint') || 'http://localhost:4566';
    const queueUrl =
      this.configService.get<string>('sqs.orderProcessingFifoUrl') ||
      'http://localhost:4566/000000000000/orders-processing.fifo';

    const sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId') || 'test',
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey') || 'test',
      },
    });

    try {
      await sqsClient.send(
        new CreateQueueCommand({
          QueueName: 'orders-processing.fifo',
          Attributes: {
            FifoQueue: 'true',
            ContentBasedDeduplication: 'true',
            MessageRetentionPeriod: '86400',
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
            `Pulled order from SQS FIFO queue for Restaurant [${restaurantId}]: Order [${orderId}]. Kitchen reviewing order...`,
          );

          // Mô phỏng nhà hàng xem xét và bấm nhận đơn sau 2.5 giây (Linh hoạt, không ép FIFO cứng nhắc ở bếp)
          setTimeout(async () => {
            try {
              this.logger.log(`Kitchen accepted Order: ${orderId}. Updating status to ACCEPTED and broadcasting to drivers via SNS.`);
              await this.updateOrderStatusUseCase.execute({
                orderId,
                dto: { status: OrderStatus.ACCEPTED },
                changedBy: `restaurant:${restaurantId}`,
              });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.error(`Failed to accept order ${orderId}: ${msg}`);
            }
          }, 2500);

          return message;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error processing FIFO message: ${msg}`);
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
