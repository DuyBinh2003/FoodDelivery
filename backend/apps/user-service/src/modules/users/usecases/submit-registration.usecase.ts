import { Injectable, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { CreateRegistrationDto, RegistrationType } from '@/modules/users/dto/create-registration.dto.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { RegistrationEventTypes, RegistrationCreatedEvent } from '@/events/index.js';

@Injectable()
export class SubmitRegistrationUseCase {
  private snsClient: SNSClient;

  constructor(
    @Inject(RegistrationWriteRepository) private readonly writeRepo: RegistrationWriteRepository,
    @InjectRepository(DriverProfile) private readonly driverRepo: Repository<DriverProfile>,
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
      // 1. Check if user already has an active (PENDING / APPROVED) registration request for this type
      const activeReq = await this.writeRepo.findActiveByUserIdAndType(userId, dto.type);
      if (activeReq) {
        if (activeReq.status === 'PENDING') {
          throw new ConflictException(
            dto.type === RegistrationType.RESTAURANT
              ? 'Yêu cầu đăng ký nhà hàng của bạn đang chờ phê duyệt. Vui lòng không gửi lại.'
              : 'Yêu cầu đăng ký tài xế của bạn đang chờ phê duyệt. Vui lòng không gửi lại.'
          );
        }
        if (activeReq.status === 'APPROVED') {
          throw new ConflictException(
            dto.type === RegistrationType.RESTAURANT
              ? 'Bạn đã có nhà hàng được kích hoạt trong hệ thống. Mỗi tài khoản chỉ được đăng ký 1 nhà hàng.'
              : 'Bạn đã là tài xế của hệ thống. Mỗi tài khoản chỉ được đăng ký 1 tài xế.'
          );
        }
      }

      // 2. Check if user is already an approved driver in master table
      if (dto.type === RegistrationType.DRIVER) {
        const existingDriver = await this.driverRepo.findOne({
          where: { user_id: userId, is_deleted: false },
        });
        if (existingDriver && existingDriver.verification_status === 'APPROVED') {
          throw new ConflictException('Bạn đã là tài xế của hệ thống. Mỗi tài khoản chỉ được đăng ký 1 tài xế.');
        }
      }

      const entity = await this.writeRepo.create(userId, dto);

      // Publish to SNS
      const topicArn = process.env.SNS_USER_REGISTRATION_TOPIC || 'arn:aws:sns:ap-southeast-1:000000000000:user-registration-events';

      try {
        const event: RegistrationCreatedEvent = {
          event: RegistrationEventTypes.REGISTRATION_CREATED,
          data: {
            id: entity.id,
            userId: entity.userId,
            type: entity.type as 'RESTAURANT' | 'DRIVER',
            payload: entity.payload,
            status: entity.status,
          },
        };

        await this.snsClient.send(new PublishCommand({
          TopicArn: topicArn,
          Message: JSON.stringify(event),
        }));
        console.log('[SNS] RegistrationCreated published successfully, TopicArn:', topicArn);
      } catch (err: unknown) {
        console.error('[SNS] CRITICAL: Failed to publish RegistrationCreated event:', err);
        // Do NOT throw - registration is already saved to DB, SNS failure is non-blocking
      }

      return entity;
    } catch (err: unknown) {
      if (err instanceof ConflictException) throw err;
      const message = err instanceof Error ? err.message : 'Lỗi khi gửi yêu cầu đăng ký';
      throw new BadRequestException(message);
    }
  }
}

