import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { SnsService } from '@/common/messaging/sns.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SqsService, SnsService],
  exports: [SqsService, SnsService],
})
export class MessagingModule {}
