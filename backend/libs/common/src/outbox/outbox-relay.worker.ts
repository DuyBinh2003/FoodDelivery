import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { TransactionalOutboxService } from '@/common/outbox/transactional-outbox.service.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { SnsService } from '@/common/messaging/sns.service.js';

export interface PublishResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

@Injectable()
export class OutboxRelayWorker {
  private readonly logger = new Logger(OutboxRelayWorker.name);

  constructor(
    @Inject(TransactionalOutboxService) private readonly outboxService: TransactionalOutboxService,
    @Optional() @Inject(SqsService) private readonly sqsService?: SqsService,
    @Optional() @Inject(SnsService) private readonly snsService?: SnsService,
  ) {}

  /**
   * Quét và phát tán một batch sự kiện từ t_outbox sang Message Broker
   */
  async processBatch(batchSize = 50): Promise<PublishResult> {
    const events = await this.outboxService.findPendingEvents(batchSize);

    if (events.length === 0) {
      return { totalProcessed: 0, successCount: 0, failureCount: 0 };
    }

    this.logger.log(`OutboxRelayWorker: Processing batch of ${events.length} pending events...`);

    let successCount = 0;
    let failureCount = 0;

    for (const event of events) {
      try {
        await this.publishEvent(event.event_type, event.payload);
        await this.outboxService.markAsPublished(event.id);
        successCount++;
      } catch (error: unknown) {
        failureCount++;
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to publish Outbox event ${event.id} (${event.event_type}): ${errMsg}`);
        await this.outboxService.markAsFailed(event.id, errMsg);
      }
    }

    this.logger.log(
      `OutboxRelayWorker: Batch completed. Success: ${successCount}, Failures: ${failureCount}`,
    );

    return {
      totalProcessed: events.length,
      successCount,
      failureCount,
    };
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (this.sqsService) {
      await this.sqsService.publishEvent(eventType, payload);
      return;
    }

    if (this.snsService) {
      await this.snsService.publish(eventType, payload);
      return;
    }

    this.logger.debug(`No message broker available, simulated publish for event: ${eventType}`);
  }
}

