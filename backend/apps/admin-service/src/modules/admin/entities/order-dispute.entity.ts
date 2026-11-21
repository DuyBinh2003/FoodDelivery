import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DisputeStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum DisputePriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
}

export enum ResolutionAction {
  FULL_REFUND = 'FULL_REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  VOUCHER_COMPENSATION = 'VOUCHER_COMPENSATION',
  REJECT = 'REJECT',
}

export enum PenaltyParty {
  DRIVER = 'DRIVER',
  RESTAURANT = 'RESTAURANT',
  PLATFORM = 'PLATFORM',
}

@Entity('t_order_dispute', { schema: 'schema_admin' })
export class OrderDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'varchar', length: 50 })
  reason_code: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  evidence_images: string[];

  @Column({ type: 'varchar', length: 20, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'varchar', length: 10, default: DisputePriority.NORMAL })
  priority: DisputePriority;

  @Column({ type: 'varchar', length: 30, nullable: true })
  resolution_action: ResolutionAction | null;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: '0' })
  refund_amount: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  penalty_party: PenaltyParty | null;

  @Column({ type: 'uuid', nullable: true })
  assigned_cs_id: string | null;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @Column({ type: 'bigint', default: 0 })
  version: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
