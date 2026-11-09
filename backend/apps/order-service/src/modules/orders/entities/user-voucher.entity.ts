import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

@Entity('t_user_voucher', { schema: 'schema_order' })
@Index(['user_id', 'status'])
export class UserVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  voucher_id: string;

  @Column({ type: 'varchar', length: 255, default: 'unknown_device' })
  device_fingerprint: string;

  @Column({ type: 'varchar', length: 30, default: UserVoucherStatus.AVAILABLE })
  status: UserVoucherStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  claimed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne('Voucher', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Relation<Voucher>;
}
