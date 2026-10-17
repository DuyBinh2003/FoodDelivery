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
    @Inject(ConfigService) private configService: ConfigService,
  ) { }

  async onModuleInit() {
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

    try {
      await sqsClient.send(new CreateQueueCommand({
        QueueName: 'food-delivery-orders',
        Attributes: {
          MessageRetentionPeriod: '300', // 5 minutes TTL in seconds
        },
      }));
    } catch {
      // Queue already exists or created
    }

    this.consumer = Consumer.create({
      queueUrl,
      sqs: sqsClient as any,
      handleMessage: async (message) => {
        if (!message.Body) return undefined;
        try {
          const body = JSON.parse(message.Body);
          if (body.event === OrderEventTypes.ORDER_CREATED) {
            const event = body as OrderCreatedEvent;
            const { orderId } = event.data;
            this.logger.log(`Received ORDER_CREATED for Order: ${orderId}. Finding nearest driver...`);

            setTimeout(async () => {
              this.logger.log(`Driver found for Order: ${orderId}. Updating status to ACCEPTED.`);
              await fetch(`${this.orderUrl}/internal/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ACCEPTED' })
              }).catch(e => this.logger.error('Failed to update order status: ' + e.message));
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
