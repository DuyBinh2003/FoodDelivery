import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Consumer } from 'sqs-consumer';
import { AdminGateway } from '@/modules/admin/gateways/admin.gateway.js';

@Injectable()
export class RegistrationSqsConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;

  constructor(private readonly adminGateway: AdminGateway) {}

  onModuleInit() {
    const queueUrl = process.env.SQS_ADMIN_REGISTRATION_QUEUE_URL || 'http://localhost:4566/000000000000/admin-registration-queue';
    
    this.consumer = Consumer.create({
      queueUrl,
      handleMessage: async (message) => {
        try {
          const body = JSON.parse(message.Body as string);
          // SNS wraps the message in a JSON with "Message" field
          const snsMessage = JSON.parse(body.Message);
          
          if (snsMessage.eventType === 'RegistrationCreated') {
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
