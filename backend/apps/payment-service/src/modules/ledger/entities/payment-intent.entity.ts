import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('t_payment_intent', { schema: 'schema_payment' })
export class PaymentIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 0 })
  amount: string;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'varchar', length: 30 })
  payment_method: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  gateway_transaction_id: string | null;

  @Column({ type: 'varchar', length: 30, default: 'REQUIRES_PAYMENT_METHOD' })
  status: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  error_code: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
