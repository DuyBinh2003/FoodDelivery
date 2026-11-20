import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum WebhookDeliveryStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

@Entity('t_webhook_delivery_log', { schema: 'schema_order' })
export class WebhookDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  subscription_id!: string;

  @Column({ type: 'varchar', length: 50 })
  event_type!: string;

  @Column({ type: 'uuid' })
  event_id!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20 })
  status!: WebhookDeliveryStatus;

  @Column({ type: 'integer', nullable: true })
  http_status_code!: number | null;

  @Column({ type: 'text', nullable: true })
  response_body!: string | null;

  @Column({ type: 'integer', default: 1 })
  attempt_count!: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_attempt_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
