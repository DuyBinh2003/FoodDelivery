import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly logger = new Logger(SqsService.name);

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const region = this.configService.get<string>('aws.region')!;
    const endpoint = this.configService.get<string>('sqs.endpoint')!;

    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      }
    });

    this.queueUrl = this.configService.get<string>('sqs.queueUrl')!;
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
