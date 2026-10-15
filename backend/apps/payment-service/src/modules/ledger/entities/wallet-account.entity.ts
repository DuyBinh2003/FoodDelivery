import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AccountCategory, OwnerType, WalletStatus } from '@/modules/ledger/constants/ledger.enums.js';

@Entity('m_wallet_account', { schema: 'schema_payment' })
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  owner_id: string;

  @Column({ type: 'varchar', length: 30 })
  owner_type: OwnerType;

  @Column({ type: 'varchar', length: 30 })
  account_category: AccountCategory;

  @Column({ type: 'varchar', length: 100, unique: true })
  account_code: string;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: WalletStatus.ACTIVE })
  status: WalletStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
