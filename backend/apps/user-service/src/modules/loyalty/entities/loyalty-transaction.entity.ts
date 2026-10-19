import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { LoyaltyTransactionType, LoyaltyReferenceType } from '@/modules/loyalty/enums/loyalty-transaction-type.enum.js';
import type { LoyaltyWallet } from '@/modules/loyalty/entities/loyalty-wallet.entity.js';

@Entity('t_loyalty_transaction', { schema: 'schema_user' })
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  wallet_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 30 })
  transaction_type: LoyaltyTransactionType;

  @Column({ type: 'integer' })
  points: number;

  @Column({ type: 'integer' })
  balance_after: number;

  @Column({ type: 'varchar', length: 30 })
  reference_type: LoyaltyReferenceType;

  @Column({ type: 'varchar', length: 100 })
  reference_id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne('LoyaltyWallet', 'transactions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Relation<LoyaltyWallet>;
}
