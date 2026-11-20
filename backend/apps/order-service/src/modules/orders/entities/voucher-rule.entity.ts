import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { RuleType } from '@/modules/orders/enums/rule-type.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

@Entity('m_voucher_rule', { schema: 'schema_order' })
export class VoucherRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  voucher_id: string;

  @Column({ type: 'varchar', length: 50 })
  rule_type: RuleType;

  @Column({ type: 'varchar', length: 20, default: 'EQUALS' })
  operator: string;

  @Column({ type: 'jsonb' })
  rule_payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255 })
  error_message: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne('Voucher', 'rules', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Relation<Voucher>;
}
