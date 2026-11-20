import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('m_webhook_subscription', { schema: 'schema_order' })
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  target_name!: string;

  @Column({ type: 'text' })
  target_url!: string;

  @Column({ type: 'text', array: true })
  subscribed_events!: string[];

  @Column({ type: 'varchar', length: 255 })
  secret_key!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
