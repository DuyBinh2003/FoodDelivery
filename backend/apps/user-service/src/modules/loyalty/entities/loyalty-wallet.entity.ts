import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { MembershipTier } from '@/modules/loyalty/enums/membership-tier.enum.js';
import type { LoyaltyTransaction } from '@/modules/loyalty/entities/loyalty-transaction.entity.js';

@Entity('m_loyalty_wallet', { schema: 'schema_user' })
export class LoyaltyWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'integer', default: 0 })
  available_points: number;

  @Column({ type: 'integer', default: 0 })
  lifetime_points: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: MembershipTier.BRONZE,
  })
  tier: MembershipTier;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @OneToMany('LoyaltyTransaction', 'wallet')
  transactions: Relation<LoyaltyTransaction[]>;
}
