import { Injectable, ConflictException } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { CreateRegistrationDto } from '@/modules/users/dto/create-registration.dto.js';

@Injectable()
export class SubmitRegistrationUseCase {
  private snsClient: SNSClient;

  constructor(
    private readonly writeRepo: RegistrationWriteRepository,
  ) {
    this.snsClient = new SNSClient({
      region: 'ap-southeast-1',
      endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  }

  async execute(userId: string, dto: CreateRegistrationDto) {
    // Check idempotency / spam
    const existing = await this.writeRepo.findPendingByUserId(userId);
    if (existing) {
      throw new ConflictException('You already have a pending registration request.');
    }

    const entity = await this.writeRepo.create(userId, dto);

    // Publish to SNS
    const topicArn = process.env.SNS_USER_REGISTRATION_TOPIC || 'arn:aws:sns:ap-southeast-1:000000000000:user-registration-events';

    try {
      await this.snsClient.send(new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({
          eventType: 'RegistrationCreated',
          data: entity
        })
      }));
    } catch (err) {
      console.error('Failed to publish to SNS:', err);
    }

    return entity;
  }
}
