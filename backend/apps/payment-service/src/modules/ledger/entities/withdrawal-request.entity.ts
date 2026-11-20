import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { WithdrawalStatus } from '@/modules/ledger/constants/ledger.enums.js';

@Entity('t_withdrawal_request', { schema: 'schema_payment' })
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  wallet_account_id: string;

  @Column({ type: 'uuid' })
  requester_id: string;

  @Column({ type: 'varchar', length: 20 })
  requester_type: 'DRIVER' | 'RESTAURANT';

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: '0' })
  fee: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  net_amount: string;

  @Column({ type: 'varchar', length: 20 })
  bank_code: string;

  @Column({ type: 'varchar', length: 50 })
  bank_account_number: string;

  @Column({ type: 'varchar', length: 100 })
  bank_account_name: string;

  @Column({ type: 'varchar', length: 20, default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_transaction_ref: string | null;

  @Column({ type: 'uuid', nullable: true })
  processed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
