import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqsService } from '@/common/messaging/sqs.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SqsService],
  exports: [SqsService],
})
export class MessagingModule {}
