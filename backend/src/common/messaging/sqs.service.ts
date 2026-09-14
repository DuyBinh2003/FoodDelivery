import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly logger = new Logger(SqsService.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const endpoint = this.configService.get<string>('SQS_ENDPOINT', 'http://localhost:4566'); // default for local

    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', 'test'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', 'test'),
      }
    });

    // Default URL format for localstack is http://<host>:4566/000000000000/<queue-name>
    this.queueUrl = this.configService.get<string>('SQS_QUEUE_URL', 'http://localhost:4566/000000000000/food-delivery-orders');
  }

  async publishEvent(eventName: string, payload: any) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({
          event: eventName,
          data: payload,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await this.sqsClient.send(command);
      this.logger.log(`Event ${eventName} published to SQS with MessageId: ${result.MessageId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to publish event ${eventName} to SQS: ${error.message}`, error.stack);
      throw error;
    }
  }
}
