import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('m_wallet_balance', { schema: 'schema_payment' })
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  wallet_account_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 0, default: '0' })
  available_balance: string;

  @Column({ type: 'numeric', precision: 18, scale: 0, default: '0' })
  locked_balance: string;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'bigint', default: 0 })
  version: string;

  @Column({ type: 'uuid', nullable: true })
  last_ledger_entry_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
