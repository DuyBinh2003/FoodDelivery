import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';
import { Consumer } from 'sqs-consumer';
import { OrderEventTypes, OrderCreatedEvent } from '@/events/index.js';
import { DispatchService } from '@/modules/dispatch/dispatch.service.js';

@Injectable()
export class DriversConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(DriversConsumer.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional() @Inject(DispatchService) private readonly dispatchService?: DispatchService,
  ) {}

  async onModuleInit() {
    const region = this.configService.getOrThrow<string>('aws.region');
    const endpoint = this.configService.getOrThrow<string>('sqs.endpoint');
    const queueUrl = this.configService.getOrThrow<string>('sqs.driverDispatchQueueUrl');

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

          // 1. Khi nhận ORDER_READY_FOR_PICKUP hoặc ORDER_ACCEPTED từ SNS Fanout
          if (
            body.event === OrderEventTypes.ORDER_READY_FOR_PICKUP ||
            body.event === 'ORDER_READY_FOR_PICKUP' ||
            body.event === OrderEventTypes.ORDER_ACCEPTED ||
            body.event === 'ORDER_ACCEPTED'
          ) {
            const orderId = body.data?.orderId;
            const restaurantName = body.data?.restaurantName || 'Nhà hàng';
            this.logger.log(
              `[DriversConsumer] Received broadcast ORDER_READY_FOR_PICKUP from SNS Fanout for Order [${orderId}] (${restaurantName}). Available for drivers to claim.`,
            );

            // Tự động kích hoạt thuật toán chia cuốc (Order Routing)
            if (orderId && this.dispatchService) {
              await this.dispatchService.dispatchOrder({
                orderId,
                restaurantName: body.data?.restaurantName,
                restaurantAddress: body.data?.restaurantAddress,
                restaurantLat: body.data?.restaurantLat,
                restaurantLng: body.data?.restaurantLng,
                deliveryAddress: body.data?.deliveryAddress,
                deliveryLat: body.data?.deliveryLat,
                deliveryLng: body.data?.deliveryLng,
                distanceKm: body.data?.distanceKm,
                deliveryFee: body.data?.deliveryFee,
                driverEarnings: body.data?.driverEarnings,
                itemsCount: body.data?.itemsCount,
              }).catch((err: unknown) => {
                this.logger.error(`Error in dispatchOrder for [${orderId}]:`, err);
              });
            }
          }

          // 2. Dự phòng sự kiện ORDER_CREATED
          if (body.event === OrderEventTypes.ORDER_CREATED) {
            const event = body as OrderCreatedEvent;
            const { orderId } = event.data;
            this.logger.log(`[DriversConsumer] Received ORDER_CREATED for Order: ${orderId}.`);
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
