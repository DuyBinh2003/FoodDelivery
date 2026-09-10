import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('t_order_item', { schema: 'schema_order' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  menu_item_id: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  unit_price: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
