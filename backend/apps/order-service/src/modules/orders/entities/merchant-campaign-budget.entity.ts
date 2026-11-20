import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Campaign } from '@/modules/orders/entities/campaign.entity.js';

@Entity('m_merchant_campaign_budget', { schema: 'schema_order' })
@Index(['campaign_id', 'restaurant_id'], { unique: true })
export class MerchantCampaignBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'uuid' })
  restaurant_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  merchant_budget_cap: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  current_spent_amount: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne('Campaign', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Relation<Campaign>;
}
