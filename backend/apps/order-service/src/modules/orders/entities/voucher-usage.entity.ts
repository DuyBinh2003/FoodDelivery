import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { VoucherUsageStatus } from '@/modules/orders/enums/voucher-usage-status.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

@Entity('t_voucher_usage', { schema: 'schema_order' })
export class VoucherUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  voucher_id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  discount_amount: number;

  @Column({ type: 'varchar', length: 30, default: VoucherUsageStatus.APPLIED })
  status: VoucherUsageStatus;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  applied_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reverted_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne('Voucher', 'usages')
  @JoinColumn({ name: 'voucher_id' })
  voucher: Relation<Voucher>;
}
