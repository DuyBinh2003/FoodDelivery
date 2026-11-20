import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import { VoucherCategory } from '@/modules/orders/enums/voucher-category.enum.js';
import { DistributionType } from '@/modules/orders/enums/distribution-type.enum.js';
import type { VoucherUsage } from '@/modules/orders/entities/voucher-usage.entity.js';
import type { Campaign } from '@/modules/orders/entities/campaign.entity.js';
import type { VoucherRule } from '@/modules/orders/entities/voucher-rule.entity.js';

@Entity('m_voucher', { schema: 'schema_order' })
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  campaign_id: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30, default: VoucherType.PERCENTAGE })
  voucher_type: VoucherType;

  @Column({ type: 'varchar', length: 30, default: VoucherCategory.PLATFORM_DISCOUNT })
  voucher_category: VoucherCategory;

  @Column({ type: 'varchar', length: 30, default: DistributionType.COLLECTIBLE })
  distribution_type: DistributionType;

  @Column({ type: 'varchar', length: 30, default: VoucherSponsor.PLATFORM })
  sponsor_type: VoucherSponsor;

  @Column({ type: 'uuid', nullable: true })
  restaurant_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  target_restaurant_id: string | null;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  discount_value: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  max_discount_amount: number | null;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  min_order_amount: number;

  @Column({ type: 'integer' })
  total_quantity: number;

  @Column({ type: 'integer', default: 0 })
  claimed_quantity: number;

  @Column({ type: 'integer', default: 0 })
  used_quantity: number;

  @Column({ type: 'integer', default: 1 })
  max_claims_per_user: number;

  @Column({ type: 'integer', default: 1 })
  max_usage_per_user: number;

  @Column({ type: 'timestamptz' })
  valid_from: Date;

  @Column({ type: 'timestamptz' })
  valid_to: Date;

  @Column({ type: 'integer', nullable: true })
  start_hour: number | null;

  @Column({ type: 'integer', nullable: true })
  end_hour: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @ManyToOne('Campaign', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Relation<Campaign | null>;

  @OneToMany('VoucherUsage', 'voucher')
  usages: Relation<VoucherUsage[]>;

  @OneToMany('VoucherRule', 'voucher')
  rules?: Relation<VoucherRule[]>;
}
