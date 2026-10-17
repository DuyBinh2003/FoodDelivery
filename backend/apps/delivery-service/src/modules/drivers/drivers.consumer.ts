import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';
import { Consumer } from 'sqs-consumer';
import { OrderEventTypes, OrderCreatedEvent } from '@/events/index.js';

@Injectable()
export class DriversConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(DriversConsumer.name);
  private readonly orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const region = this.configService.get<string>('aws.region') || 'ap-southeast-1';
    const endpoint = this.configService.get<string>('sqs.endpoint') || 'http://localhost:4566';
    const queueUrl =
      this.configService.get<string>('sqs.driverDispatchQueueUrl') ||
      'http://localhost:4566/000000000000/driver-dispatch-queue';

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
          QueueName: 'driver-dispatch-queue',
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
          let body = JSON.parse(message.Body);

          // Nếu message đến từ SNS Fanout Subscription (SNS Notification Envelope)
          if (body.Type === 'Notification' && body.Message) {
            try {
              body = JSON.parse(body.Message);
            } catch {
              // Body message is raw text
            }
          }

          // 1. Khi nhận ORDER_ACCEPTED từ SNS Fanout của Bếp Nhà hàng
          if (body.event === OrderEventTypes.ORDER_ACCEPTED || body.event === 'ORDER_ACCEPTED') {
            const orderId = body.data?.orderId;
            this.logger.log(`Received ORDER_ACCEPTED from SNS Fanout for Order: ${orderId}. Matching nearest driver...`);

            setTimeout(async () => {
              this.logger.log(`Driver assigned for Order: ${orderId}. Updating status to DELIVERING.`);
              await fetch(`${this.orderUrl}/internal/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DELIVERING' }),
              }).catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.error(`Failed to update order status to DELIVERING: ${msg}`);
              });

              // Mô phỏng quá trình giao hàng trong 5 giây rồi hoàn tất (COMPLETED)
              setTimeout(async () => {
                this.logger.log(`Driver completed delivery for Order: ${orderId}. Updating status to COMPLETED (Triggering DB write).`);
                await fetch(`${this.orderUrl}/internal/orders/${orderId}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'COMPLETED' }),
                }).catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : String(e);
                  this.logger.error(`Failed to update order status to COMPLETED: ${msg}`);
                });
              }, 5000);
            }, 3000);
          }

          // 2. Dự phòng cho luồng cũ nếu có ORDER_CREATED
          if (body.event === OrderEventTypes.ORDER_CREATED) {
            const event = body as OrderCreatedEvent;
            const { orderId } = event.data;
            this.logger.log(`Received ORDER_CREATED for Order: ${orderId}.`);
          }

          return message;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error processing message: ${msg}`);
          throw err;
        }
      },
    });

    this.consumer.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SQS Consumer Error: ${msg}`);
    });

    this.consumer.on('processing_error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SQS Consumer Processing Error: ${msg}`);
    });

    this.consumer.start();
    this.logger.log(`Drivers SQS Consumer started listening to ${queueUrl}`);
  }

  onModuleDestroy() {
    if (this.consumer) {
      this.consumer.stop();
      this.logger.log('Drivers SQS Consumer stopped.');
    }
  }
}
