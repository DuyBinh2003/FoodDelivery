import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TransactionStatus } from '../constants/ledger.enums.js';

@Entity('t_ledger_transaction', { schema: 'schema_payment' })
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  transaction_code: string;

  @Column({ type: 'varchar', length: 50 })
  reference_type: string;

  @Column({ type: 'varchar', length: 100 })
  reference_id: string;

  @Column({ type: 'varchar', length: 30, default: TransactionStatus.POSTED })
  status: TransactionStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  idempotency_key: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  posted_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
