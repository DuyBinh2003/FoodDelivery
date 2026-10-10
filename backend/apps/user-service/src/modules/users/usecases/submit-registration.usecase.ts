import { Injectable, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { CreateRegistrationDto } from '@/modules/users/dto/create-registration.dto.js';

@Injectable()
export class SubmitRegistrationUseCase {
  private snsClient: SNSClient;

  constructor(
    @Inject(RegistrationWriteRepository) private readonly writeRepo: RegistrationWriteRepository,
  ) {
    this.snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.SNS_ENDPOINT || 'http://localhost:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });
  }

  async execute(userId: string, dto: CreateRegistrationDto) {
    try {
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
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: entity
          })
        }));
        console.log('[SNS] RegistrationCreated published successfully, TopicArn:', topicArn);
      } catch (err) {
        console.error('[SNS] CRITICAL: Failed to publish RegistrationCreated event:', err);
        // Do NOT throw — registration is already saved to DB, SNS failure is non-blocking
      }

      return entity;
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      throw new BadRequestException(err.message);
    }
  }
}
