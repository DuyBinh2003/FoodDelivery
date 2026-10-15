import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EntryType } from '../constants/ledger.enums.js';

@Entity('t_ledger_entry', { schema: 'schema_payment' })
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ledger_transaction_id: string;

  @Column({ type: 'uuid' })
  wallet_account_id: string;

  @Column({ type: 'varchar', length: 10 })
  entry_type: EntryType;

  @Column({ type: 'numeric', precision: 18, scale: 0 })
  amount: string;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'numeric', precision: 18, scale: 0 })
  balance_after: string;

  @Column({ type: 'integer' })
  sequence_num: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
