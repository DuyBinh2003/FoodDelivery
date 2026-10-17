import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class SnsService {
  private readonly snsClient: SNSClient;
  private readonly logger = new Logger(SnsService.name);

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('aws.region');
    const endpoint = this.configService.getOrThrow<string>('sns.endpoint');

    this.snsClient = new SNSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('aws.accessKeyId'),
        secretAccessKey: this.configService.getOrThrow<string>('aws.secretAccessKey'),
      },
    });
  }

  async publishEvent(topicArn: string, eventName: string, payload: unknown) {
    try {
      const command = new PublishCommand({
        TopicArn: topicArn,
        Subject: eventName,
        Message: JSON.stringify({
          event: eventName,
          data: payload,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await this.snsClient.send(command);
      this.logger.log(`Event ${eventName} published to SNS Topic ${topicArn} with MessageId: ${result.MessageId}`);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to publish event ${eventName} to SNS Topic ${topicArn}: ${msg}`, stack);
      throw error;
    }
  }
}
