import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('t_idempotency_key', { schema: 'schema_payment' })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 64 })
  request_hash: string;

  @Column({ type: 'varchar', length: 20, default: 'PROCESSING' })
  status: string;

  @Column({ type: 'integer', nullable: true })
  response_status_code: number | null;

  @Column({ type: 'jsonb', nullable: true })
  response_body: Record<string, unknown> | null;

  @Column({ type: 'timestamptz' })
  locked_until: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
