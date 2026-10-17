import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand, SetQueueAttributesCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService implements OnModuleInit {
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

  async onModuleInit() {
    try {
      await this.sqsClient.send(
        new SetQueueAttributesCommand({
          QueueUrl: this.queueUrl,
          Attributes: {
            MessageRetentionPeriod: '300', // 5 minutes (300 seconds)
          },
        }),
      );
      this.logger.log(`Configured SQS Queue MessageRetentionPeriod (TTL) to 300s (5 minutes) for ${this.queueUrl}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not set MessageRetentionPeriod on queue: ${msg}`);
    }
  }

  async publishEvent(eventName: string, payload: unknown) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({
          event: eventName,
          data: payload,
          timestamp: new Date().toISOString(),
          ttl: 300, // 5 minutes TTL in seconds
        }),
        MessageAttributes: {
          TTL: {
            DataType: 'Number',
            StringValue: '300',
          },
        },
      });

      const result = await this.sqsClient.send(command);
      this.logger.log(`Event ${eventName} published to SQS with MessageId: ${result.MessageId} (TTL: 300s)`);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to publish event ${eventName} to SQS: ${msg}`, stack);
      throw error;
    }
  }
}
