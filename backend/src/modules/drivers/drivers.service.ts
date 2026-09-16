import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Consumer } from 'sqs-consumer';
import { OrdersService } from '@/modules/orders/orders.service.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class DriversService implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(OrdersService) private readonly ordersService: OrdersService,
  ) { }

  onModuleInit() {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const endpoint = this.configService.get<string>('SQS_ENDPOINT', 'http://localhost:4566');
    const queueUrl = this.configService.get<string>('SQS_QUEUE_URL', 'http://localhost:4566/000000000000/food-delivery-orders');

    const sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', 'test'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', 'test'),
      },
    });

    this.consumer = Consumer.create({
      queueUrl,
      sqs: sqsClient as any, // sqs-consumer sometimes has slight type mismatch with v3 client, casting to any is a quick workaround
      handleMessage: async (message) => {
        if (!message.Body) return undefined;
        try {
          const body = JSON.parse(message.Body);
          if (body.event === 'ORDER_CREATED') {
            const { orderId } = body.data;
            this.logger.log(`Received ORDER_CREATED for Order: ${orderId}. Finding nearest driver...`);

            // Mocking driver search logic
            setTimeout(async () => {
              this.logger.log(`Driver found for Order: ${orderId}. Updating status to ACCEPTED.`);
              await this.ordersService.updateStatus(orderId, { status: OrderStatus.ACCEPTED });
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
