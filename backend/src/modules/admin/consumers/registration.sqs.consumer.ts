import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Consumer } from 'sqs-consumer';
import { AdminGateway } from '@/modules/admin/gateways/admin.gateway.js';
import { SQSClient } from '@aws-sdk/client-sqs';

@Injectable()
export class RegistrationSqsConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;

  constructor(private readonly adminGateway: AdminGateway) { }

  onModuleInit() {
    const queueUrl = process.env.SQS_ADMIN_REGISTRATION_QUEUE_URL || 'http://localhost:4566/000000000000/admin-registration-queue';

    const sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.SQS_ENDPOINT || 'http://localhost:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });

    this.consumer = Consumer.create({
      queueUrl,
      sqs: sqsClient as any,
      handleMessage: async (message) => {
        try {
          const body = JSON.parse(message.Body as string);
          // SNS wraps the message in a JSON with "Message" field
          const snsMessage = JSON.parse(body.Message);

          if (snsMessage.eventType === 'RegistrationCreated') {
            console.log('Successfully processed RegistrationCreated event for:', snsMessage.data?.userId);
            this.adminGateway.server.to('admin_notifications').emit('new_registration', snsMessage.data);
          }
        } catch (error) {
          console.error('Error processing SQS message:', error);
        }
        return message;
      },
    });

    this.consumer.on('error', (err) => {
      console.error('SQS Consumer Error:', err.message);
    });

    this.consumer.on('processing_error', (err) => {
      console.error('SQS Processing Error:', err.message);
    });

    this.consumer.start();
    console.log('Registration SQS Consumer started.');
  }

  onModuleDestroy() {
    if (this.consumer) {
      this.consumer.stop();
    }
  }
}
