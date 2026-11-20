import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from '@/common/outbox/entities/outbox-event.entity.js';
import { TransactionalOutboxService } from '@/common/outbox/transactional-outbox.service.js';
import { OutboxRelayWorker } from '@/common/outbox/outbox-relay.worker.js';
import { MessagingModule } from '@/common/messaging/messaging.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent]), MessagingModule],
  providers: [TransactionalOutboxService, OutboxRelayWorker],
  exports: [TransactionalOutboxService, OutboxRelayWorker, TypeOrmModule],
})
export class OutboxModule {}

