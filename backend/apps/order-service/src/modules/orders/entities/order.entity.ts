import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { OrderItem } from '@/modules/orders/entities/order-item.entity.js';
import type { OrderReview } from '@/modules/orders/entities/order-review.entity.js';

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  COOKING = 'COOKING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('t_order', { schema: 'schema_order' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid' })
  restaurant_id: string;

  @Column({ type: 'uuid', nullable: true })
  driver_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 50, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'text' })
  delivery_address: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimated_delivery_time: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'CASH' })
  payment_method: string;

  @Column({ type: 'timestamptz', nullable: true })
  cooking_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ready_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  driver_claimed_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @OneToMany('OrderItem', 'order')
  items: Relation<OrderItem[]>;

  @OneToOne('OrderReview', 'order')
  review: Relation<OrderReview>;
}
