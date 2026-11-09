import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { CampaignSponsor } from '@/modules/orders/enums/campaign-sponsor.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

@Entity('m_campaign', { schema: 'schema_order' })
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 30, default: CampaignSponsor.PLATFORM })
  sponsor_type: CampaignSponsor;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 100.00 })
  platform_share_ratio: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.00 })
  merchant_share_ratio: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.00 })
  partner_share_ratio: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  total_budget_amount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0.00 })
  current_spent_amount: number;

  @Column({ type: 'boolean', default: false })
  emergency_killed: boolean;

  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz' })
  end_time: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany('Voucher', 'campaign')
  vouchers: Relation<Voucher[]>;
}
